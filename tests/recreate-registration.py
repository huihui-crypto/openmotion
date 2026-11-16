"""Run through vision-tools.mjs python using the managed vision runtime."""

import importlib.util
import json
from pathlib import Path
import sys
import subprocess
import tempfile
import unittest

import cv2
import numpy as np


source = Path(__file__).resolve().parents[1] / 'skills/openmotion-recreate/scripts/register_motion.py'
spec = importlib.util.spec_from_file_location('register_motion', source)
registration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(registration)
sys.modules['register_motion'] = registration
motion_spec = importlib.util.spec_from_file_location('measure_motion', source.with_name('measure_motion.py'))
motion = importlib.util.module_from_spec(motion_spec)
motion_spec.loader.exec_module(motion)


class RegistrationTests(unittest.TestCase):
    def setUp(self):
        random = np.random.default_rng(18)
        self.anchor = random.integers(0, 256, (720, 1280, 3), dtype=np.uint8)
        self.anchor = cv2.GaussianBlur(self.anchor, (5, 5), 0)
        self.expected = np.array([[1.01, -.025, 24], [.018, .99, -15], [.000015, -.00001, 1.]])
        self.current = cv2.warpPerspective(self.anchor, self.expected, (1280, 720))

    def test_perspective_and_roi_offset_use_original_coordinates(self):
        result = registration.estimate_transform(self.anchor, self.current, [170, 110, 870, 490], max_width=700)
        self.assertEqual(result['status'], 'measured', result)
        points = np.float32([[250, 180], [900, 200], [850, 530], [300, 500]]).reshape(-1, 1, 2)
        actual = cv2.perspectiveTransform(points, np.array(result['anchorToFrame']))
        expected = cv2.perspectiveTransform(points, self.expected)
        self.assertLess(float(np.linalg.norm(actual - expected, axis=2).max()), 1.5)

    def test_exclusion_outside_roi_does_not_erase_valid_features(self):
        result = registration.estimate_transform(self.anchor, self.current, [170, 110, 870, 490],
                                                 excluded=[[0, 0, 50, 50], [1100, 650, 100, 60]])
        self.assertEqual(result['status'], 'measured', result)

    def test_uniform_region_is_unresolved(self):
        blank = np.zeros_like(self.anchor)
        result = registration.estimate_transform(blank, blank, [0, 0, 1280, 720])
        self.assertEqual(result['status'], 'unresolved')
        self.assertNotIn('anchorToFrame', result)

    def test_thin_region_is_unresolved_when_downsampled(self):
        result = registration.estimate_transform(self.anchor, self.anchor, [0, 100, 1280, 1], max_width=64)
        self.assertEqual(result['status'], 'unresolved', result)
        self.assertNotIn('anchorToFrame', result)


class VisibleMotionTests(unittest.TestCase):
    def setUp(self):
        random = np.random.default_rng(42)
        image = random.integers(0, 256, (240, 480, 3), dtype=np.uint8)
        self.texture = cv2.GaussianBlur(image, (5, 5), 0)
        self.roi = [90, 40, 300, 160]

    def sequence(self, positions):
        for index, offset in enumerate(positions):
            transform = np.float32([[1, 0, 0], [0, 1, offset]])
            yield index / 24, cv2.warpAffine(self.texture, transform, (480, 240))

    def test_moving_reference_and_static_composite_warns(self):
        reference = motion.track_frames(self.sequence(range(0, 25, 2)), self.roi, max_width=180)
        output = motion.track_frames(self.sequence([0] * 13), self.roi, max_width=180)
        self.assertEqual(reference['status'], 'measured', reference)
        self.assertEqual(output['status'], 'measured', output)
        self.assertAlmostEqual(reference['spanPx'][1], 24, delta=.5)
        self.assertLess(output['pathLengthPx'], .1)
        for result in [reference, output]:
            result.update(width=480, height=240)
        self.assertTrue(motion.suppression_warning(reference, output))
        self.assertFalse(motion.suppression_warning(reference, reference))
        partial = {**reference, 'spanPx': [0, 6]}
        self.assertTrue(motion.suppression_warning(reference, partial))
        resized = {**reference, 'spanPx': [0, 12], 'width': 240, 'height': 120}
        self.assertFalse(motion.suppression_warning(reference, resized))
        for pair in reference['pointPairs']:
            self.assertGreaterEqual(pair['start'][0], self.roi[0])
            self.assertGreaterEqual(pair['start'][1], self.roi[1])
            self.assertAlmostEqual(pair['end'][1] - pair['start'][1], 24, delta=.5)

    def test_out_and_back_motion_retains_travel_span(self):
        result = motion.track_frames(self.sequence([0, 2, 4, 6, 4, 2, 0]), self.roi)
        self.assertEqual(result['status'], 'measured', result)
        self.assertAlmostEqual(result['samples'][-1]['medianDyPx'], 0, delta=.3)
        self.assertAlmostEqual(result['spanPx'][1], 6, delta=.3)
        self.assertAlmostEqual(result['pathLengthPx'], 12, delta=.5)

    def test_fast_travel_accumulates_through_adjacent_frames(self):
        result = motion.track_frames(self.sequence(range(0, 61, 6)), self.roi)
        self.assertEqual(result['status'], 'measured', result)
        self.assertAlmostEqual(result['spanPx'][1], 60, delta=1)
        self.assertAlmostEqual(result['pathLengthPx'], 60, delta=1)

    def test_uniform_region_is_unresolved_and_cannot_clear_output(self):
        frames = [(index / 24, np.zeros_like(self.texture)) for index in range(3)]
        result = motion.track_frames(frames, self.roi)
        self.assertEqual(result['status'], 'unresolved')
        self.assertIsNone(motion.suppression_warning(result, result))

    def test_video_interval_and_native_timestamps(self):
        with tempfile.TemporaryDirectory() as directory:
            filename = Path(directory) / 'motion.avi'
            writer = cv2.VideoWriter(str(filename), cv2.VideoWriter_fourcc(*'MJPG'), 24, (480, 240))
            self.assertTrue(writer.isOpened())
            for _, image in self.sequence(range(20)):
                writer.write(image)
            writer.release()
            result = motion.measure_video(filename, .125, .625, self.roi, 640)
            self.assertEqual(result['status'], 'measured', result)
            self.assertAlmostEqual(result['samples'][0]['time'], .125, places=3)
            self.assertAlmostEqual(result['samples'][-1]['time'], .625, places=3)
            incomplete = motion.measure_video(filename, .125, 1.5, self.roi, 640)
            self.assertEqual(incomplete['status'], 'unresolved')

    def test_source_observation_cli_and_existing_output_comparison(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            for name, positions in [('moving', range(20)), ('static', [0] * 20)]:
                writer = cv2.VideoWriter(str(directory / (name + '.avi')), cv2.VideoWriter_fourcc(*'MJPG'), 24, (480, 240))
                self.assertTrue(writer.isOpened())
                for _, image in self.sequence(positions):
                    writer.write(image)
                writer.release()
            command = [sys.executable, str(source.with_name('measure_motion.py')), str(directory / 'moving.avi')]
            timing = ['--start', '.125', '--end', '.625', '--roi', ','.join(map(str, self.roi))]
            source_report = directory / 'source.json'
            observed = subprocess.run([*command, *timing, '--out', str(source_report)], capture_output=True, text=True)
            self.assertEqual(observed.returncode, 0, observed.stderr)
            report = json.loads(source_report.read_text())
            self.assertFalse(report['comparisonPerformed'])
            self.assertIsNone(report['output'])
            self.assertIsNone(report['possibleSuppressedMotion'])
            self.assertAlmostEqual(report['reference']['spanPx'][1], 12, delta=.5)
            self.assertEqual(len(report['reference']['samples']), 13)
            invalid = subprocess.run([*command, *timing, '--output-roi', '90,40,300,160', '--out', str(source_report)], capture_output=True, text=True)
            self.assertEqual(invalid.returncode, 2)

            comparison_report = directory / 'comparison.json'
            compared = subprocess.run([*command, str(directory / 'static.avi'), *timing, '--out', str(comparison_report)], capture_output=True, text=True)
            self.assertEqual(compared.returncode, 2, compared.stderr)
            report = json.loads(comparison_report.read_text())
            self.assertTrue(report['comparisonPerformed'])
            self.assertTrue(report['possibleSuppressedMotion'])
            self.assertEqual(report['output']['status'], 'measured')

            identical = subprocess.run([*command, str(directory / 'moving.avi'), *timing, '--out', str(comparison_report)], capture_output=True, text=True)
            self.assertEqual(identical.returncode, 0, identical.stderr)
            self.assertFalse(json.loads(comparison_report.read_text())['possibleSuppressedMotion'])


if __name__ == '__main__':
    unittest.main()
