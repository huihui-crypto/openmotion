import type { GalleryTemplate } from './catalog.ts';

export const blackFridayStages = [
  { id: 'tease', title: 'Before the sale', description: 'Build anticipation and show when the sale starts.' },
  { id: 'launch', title: 'Sale launch', description: 'Show the product and make the offer easy to understand.' },
  { id: 'close', title: 'Cyber Monday and last call', description: 'Make a Cyber Monday spot or remind shoppers when the sale ends.' },
] as const;

type Stage = typeof blackFridayStages[number]['id'];
type Reference = Omit<GalleryTemplate, 'title' | 'description' | 'styles' | 'kind' | 'collection' | 'subtitle' | 'tags'> & {
  stage: Stage; en: Pick<GalleryTemplate, 'title' | 'description' | 'styles'>; zh: Pick<GalleryTemplate, 'title' | 'description' | 'styles'>;
};

// Published Prism catalog snapshot 9786bcd5-a15a-4203-b3e8-d6e084b6ffec.
// Source and hosted installations can display the same reference IDs before their catalog catches up.
const references: readonly Reference[] = [
  { id: "black-friday-a5238e113514", stage: "tease", author: "Zzz_Futurist", brand: "", sourceUrl: "https://elements.envato.com/black-friday-U2JC3CL", previewUrl: "https://r.open-design.ai/files/8f2661da8f31c5cefc72f58b19c92c8fd5d7378399c9e6bdfc3685fe3bdd084c", posterUrl: "https://r.open-design.ai/files/24d29a4713a44d32e9c4e36ad1dd23abbfe893cd1f623c194384fdc42cdc7c3c", width: 960, height: 540, duration: 16.01,
    en: { title: "Black Friday | 3D Type and Product Reveal", description: "Black 3D type on white alternates with product reveals; gradients spotlight the product before the purchase call to action.", styles: ["Text animation", "3D animation"] },
    zh: { title: "黑五｜立体排字与单品揭晓", description: "白底黑色立体大字与单品交替揭晓，以渐变色突出商品，最后落到购买入口。", styles: ["文字动效", "三维动效"] },
  },
  { id: "black-friday-f006e0669315", stage: "launch", author: "Dipto Malo", brand: "HILO Video", sourceUrl: "https://www.linkedin.com/posts/diptomalo_motiondesign-typography-saas-activity-7420388320645427200-7u7J", previewUrl: "https://r.open-design.ai/files/0813adc7a9b33a49f5614a4a9b6b652f82187d556f563774f612175e60398655", posterUrl: "https://r.open-design.ai/files/7192b88eaac24c9b570a247b895f05d8d8489634f6e139e51d9fe59b1b14c86b", width: 1280, height: 720, duration: 28.07,
    en: { title: "Black Friday | Text-led SaaS Promotion", description: "Blue-and-white blocks, short sentences and interface details build a text-led limited-time SaaS promotion.", styles: ["Text animation", "Graphic animation"] },
    zh: { title: "黑五｜SaaS 文字促销", description: "蓝白色块、短句与界面局部交替出现，用文字节奏推动 SaaS 限时促销。", styles: ["文字动效", "图形动效"] },
  },
  { id: "black-friday-8e1f61972a3c", stage: "tease", author: "", brand: "Agentcard", sourceUrl: "https://x.com/keyserfaty/status/2076726758767018125", previewUrl: "https://r.open-design.ai/files/288a5e8e09e55b724347bb3d8168ae5a48b584a548c29ed78f8d201952634f59", posterUrl: "https://r.open-design.ai/files/8cf36f900f5e8ea8e18bd57526ae8bec7bc997fc1e8d47e5273b807b062196b9", width: 1280, height: 720, duration: 31.13,
    en: { title: "Agentcard | Black-and-Gold Type and Card Launch", description: "Serif type, yellow-green glows and card interfaces reveal a technology product on black, offering a reference for launch and sale adaptations.", styles: ["Interface animation", "Text animation"] },
    zh: { title: "Agentcard｜黑金文字与卡片发布", description: "黑底衬线文字、黄绿色光晕与卡片界面逐步揭晓产品，适合科技产品发布与促销改编。", styles: ["界面动效", "文字动效"] },
  },
  { id: "black-friday-bc227306c837", stage: "launch", author: "Kuro", brand: "Kuro", sourceUrl: "https://dribbble.com/shots/16930399-BLACK-FRIDAY-SALE-ANIMATION", previewUrl: "https://r.open-design.ai/files/6c7a51065524e45974b6f56c5dd92c2ba3ff9883d1dd413461733cc89fdccec1", posterUrl: "https://r.open-design.ai/files/89892b88e33c8258136990a5a911791e876b40c41f3c7c94585fa9d52d27b903", width: 800, height: 600, duration: 15.0,
    en: { title: "Black Friday | Kuro Minimal Digital Product Sale", description: "Outline discount numerals and colorful product thumbnails stand out against minimal black backgrounds.", styles: ["Text animation", "Graphic animation"] },
    zh: { title: "黑五｜Kuro 极简数字商品促销", description: "黑底留白、描边折扣数字与彩色商品缩略图组合，突出数字商品限时优惠。", styles: ["文字动效", "图形动效"] },
  },
  { id: "black-friday-531fe685da31", stage: "close", author: "Toyda", brand: "", sourceUrl: "https://elements.envato.com/black-friday-cyber-monday-promo-7RGJEZU", previewUrl: "https://r.open-design.ai/files/6980fac994a5a1667f96b80dce65dc7c147750c2b292bb2d9213c10055d608bd", posterUrl: "https://r.open-design.ai/files/968ef3a0c48232c8da1e62c4464d13e67c06710ae7233434a5bd49730c050e5e", width: 1920, height: 1080, duration: 25.42,
    en: { title: "Black Friday | Bold Discounts and Glowing Buttons", description: "Light and deep-purple scenes alternate with oversized discount text, model footage and glowing call-to-action buttons.", styles: ["Text animation", "Graphic animation", "Live-action editing"] },
    zh: { title: "黑五｜大字折扣与发光按钮", description: "浅色与深紫画面交替，以大号折扣字、模特素材和发光按钮强化促销信息。", styles: ["文字动效", "图形动效", "实拍剪辑"] },
  },
  { id: "black-friday-7ca028ede07a", stage: "launch", author: "santoshw7885", brand: "", sourceUrl: "https://elements.envato.com/black-friday-promo-DNCBFGL", previewUrl: "https://r.open-design.ai/files/3e72e912b983bcc4555226639706783d92f9dfc60f273832f2785b8eaa36ef1f", posterUrl: "https://r.open-design.ai/files/3cad837723fbdc5e6c206999f1138cc80e4c47d46b60e175ea4555c591fcbf78", width: 960, height: 540, duration: 29.91,
    en: { title: "Black Friday | Orange-and-White Type and Sale Stickers", description: "Orange, white and black type, rotating sale stickers and product cards create a fast multi-product promotion.", styles: ["Text animation", "Graphic animation"] },
    zh: { title: "黑五｜橙白大字与折扣贴纸", description: "橙白黑大字、旋转折扣贴纸与商品卡片快速切换，适合多商品促销。", styles: ["文字动效", "图形动效"] },
  },
  { id: "black-friday-dbf6546c7845", stage: "launch", author: "MotionBlend", brand: "", sourceUrl: "https://elements.envato.com/black-friday-promo-2N3HG83", previewUrl: "https://r.open-design.ai/files/db39c512052baa52018d589d0f0ef68d8acd69789c5938531ac1c4b84a5fa05e", posterUrl: "https://r.open-design.ai/files/3271a2bd1816a4a37fcadf166725c823b34395cc14fb9dab83d570fc751331f4", width: 960, height: 540, duration: 14.44,
    en: { title: "Black Friday | Red-and-Black Type and Product Gallery", description: "Repeated red-and-black typography, product photography and masking transitions connect sale messages to a product gallery.", styles: ["Text animation", "Graphic animation", "Live-action editing"] },
    zh: { title: "黑五｜红黑重复字与商品画廊", description: "红黑重复排字配商品照片与遮罩切换，连接优惠信息与商品画廊。", styles: ["文字动效", "图形动效", "实拍剪辑"] },
  },
  { id: "black-friday-da9e0cb776ea", stage: "close", author: "Be_Achemit", brand: "", sourceUrl: "https://elements.envato.com/cyber-monday-product-promo-b183-G9TGJM2", previewUrl: "https://r.open-design.ai/files/58d548e6eb23ab631b66fef31ea48621c2e99d3b3751ba23fe9760cbb4a3c3ee", posterUrl: "https://r.open-design.ai/files/daaff718bdff7fa40045da3b18b0c50ad32e625b394130b5d5f70ffdec8a3dd9", width: 1920, height: 1080, duration: 47.32,
    en: { title: "Cyber Monday | Liquid Shapes and Product Price Tags", description: "Black-and-white liquid shapes, red price tags and electronics cutouts showcase Cyber Monday offers.", styles: ["Text animation", "Graphic animation"] },
    zh: { title: "网一｜液态图形与商品价签", description: "黑白液态形状、红色价签和数码商品抠图交替出现，突出网一优惠。", styles: ["文字动效", "图形动效"] },
  },
  { id: "black-friday-11361cdb1cdd", stage: "launch", author: "PurpleElkStudios", brand: "", sourceUrl: "https://elements.envato.com/black-friday-promo-7D2M9X7", previewUrl: "https://r.open-design.ai/files/7998eca9fea5563b5fc247736360d58059aa78e795cd964654685f7f9754570c", posterUrl: "https://r.open-design.ai/files/44bbe90c610d24e7f6d897139504e4a80b408a89de26f0a59340aca6f4359a3f", width: 960, height: 540, duration: 19.02,
    en: { title: "Black Friday | Cream Paper Collage", description: "Cream paper textures, fine black type and lifestyle-photo collages create a light Black Friday promotion.", styles: ["Text animation", "Graphic animation", "Live-action editing"] },
    zh: { title: "黑五｜米白纸感促销拼贴", description: "米白纸张纹理、细黑字与生活方式照片拼贴，呈现轻盈的黑五促销。", styles: ["文字动效", "图形动效", "实拍剪辑"] },
  },
  { id: "black-friday-784007fcc9f2", stage: "launch", author: "", brand: "Klarstein", sourceUrl: "https://www.agawilk.com/portfolio-motion-design", previewUrl: "https://r.open-design.ai/files/f7a2cd545a8eda2a30aac384750bc89bccfa5ac8bd3d23e29780ebb7fb842b9b", posterUrl: "https://r.open-design.ai/files/885e77886dc26742c9fca05406109dce6812745b2faddd06bb89942ec4fd6dc8", width: 1920, height: 1080, duration: 6.01,
    en: { title: "Klarstein | Colorful Appliances for Black Friday", description: "Appliances move from black backgrounds to bright color fields, followed by brush-mask transitions and large discount text.", styles: ["Text animation", "Graphic animation"] },
    zh: { title: "Klarstein｜彩色家电黑五促销", description: "家电从黑色背景切换到鲜艳色块，以刷痕遮罩和大号折扣文案完成短促销。", styles: ["文字动效", "图形动效"] },
  },
];

export function blackFridayReference(id: string, locale: string): GalleryTemplate | undefined {
  const reference = references.find(item => item.id === id);
  if (!reference) return;
  const { en, zh, stage: _stage, ...media } = reference;
  return { ...media, ...(locale.startsWith('zh') ? zh : en), kind: 'reference', collection: 'reference',
    subtitle: 'Black Friday', tags: ['black-friday'], hasHtmlProject: false };
}

export function blackFridayTemplates(catalog: readonly GalleryTemplate[], locale: string) {
  const available = new Map(catalog.map(item => [item.id, item]));
  return blackFridayStages.map(stage => ({
    ...stage,
    items: references.filter(item => item.stage === stage.id).map(({ id }) => available.get(id) ?? blackFridayReference(id, locale)!),
  }));
}

export const blackFridaySkillIds = ['openmotion-sale-countdown', 'openmotion-sale-promo', 'openmotion-sale-carousel'] as const;

// Publisher and creator links for the additional references from the review prototype.
export const blackFridaySourceLinks: readonly { stage: Stage; title: string; author: string; url: string }[] = [
  { stage: 'tease', title: 'Friends + Family', author: 'ILIA', url: 'https://jamesconkle.com/media/JCD_ILIA_FriendsFamily.mp4' },
  { stage: 'tease', title: 'Black Friday Campaign', author: 'Dose & Co', url: 'https://www.laura-fetch.com/dose-co' },
  { stage: 'launch', title: 'Black Friday', author: 'ILIA', url: 'https://jamesconkle.com/media/JCD_ILIA_BlackFriday.mp4' },
  { stage: 'close', title: 'Black Friday Reminder', author: 'Varya Fomicheva', url: 'https://www.svgator.com/blog/black-friday-animation-examples-kickstart-your-campaign/' },
  { stage: 'close', title: 'Cyber Monday', author: 'Ucraft', url: 'https://dribbble.com/shots/25444467-UCRAFT-CYBER-MONDAY' },
];
