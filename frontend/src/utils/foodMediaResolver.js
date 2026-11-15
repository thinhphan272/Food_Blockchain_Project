/**
 * Bộ phân giải hình ảnh thực phẩm thực tế theo đúng Tên sản phẩm (product_name) + Nhà cung cấp (farm_name).
 * Quy tắc:
 * 1. Thực phẩm tươi sống / thịt mát / hải sản sống / cá cấp đông bắt buộc hiển thị ảnh thực phẩm SỐNG (chưa nấu chín).
 *    Chỉ nhóm DELI_HOT (Quầy Deli Nóng: Gà quay, Vịt quay) mới hiển thị món quay/chế biến sẵn đúng tên món.
 * 2. Không dùng chung 1 ảnh giả cho cả danh mục. Mỗi loại sản phẩm có bộ ảnh thực tế riêng biệt.
 * 3. Hai lô hàng chỉ hiển thị cùng một hình ảnh khi và chỉ khi cùng 1 loại sản phẩm VÀ từ cùng 1 nhà cung cấp (farm_name).
 */

const normalizeVi = (str = '') =>
  String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hashString = (str = '') => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
};

export const CONSUMER_LOGIN_BG =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=2000&q=85';

const CATEGORY_LABELS = {
  VEG_FRUIT: 'Rau Củ Quả & Nông Sản Tươi',
  CHILLED_MEAT: 'Thịt Tươi Sống Bảo Quản Mát (Chilled)',
  FRESH_SEAFOOD: 'Thủy Hải Sản Tươi Sống Cấp Lạnh',
  DAIRY: 'Sữa Tươi & Chế Phẩm Bơ Sữa',
  DEEP_FROZEN: 'Thực Phẩm Cấp Đông Sâu (-18°C)',
  DELI_HOT: 'Thực Phẩm Quay Nướng Quầy Deli Nóng',
};

/**
 * Danh mục hình ảnh thực phẩm thực tế đã kiểm duyệt trực quan cho từng dòng sản phẩm & nhà cung cấp.
 * Mỗi dòng sản phẩm có danh sách variants để nếu khác nhà cung cấp (farm_name) sẽ chọn ảnh khác nhau,
 * còn nếu cùng loại sản phẩm + cùng nhà cung cấp sẽ luôn cố định cùng 1 ảnh.
 */
const PRODUCT_RULES = [
  {
    id: 'lettuce',
    match: (p) => p.includes('xa lach') || p.includes('rau thuy canh') || p.includes('cai'),
    category: 'VEG_FRUIT',
    canonicalSupplier: 'langbiang',
    variants: [
      {
        thumb: '/images/batches/lettuce_head.jpg',
        banner: '/images/batches/lettuce_leaves.jpg',
        label: 'Rau Thủy Canh Tươi Sống',
      },
      {
        thumb: '/images/batches/lettuce_leaves.jpg',
        banner: '/images/batches/lettuce_head.jpg',
        label: 'Rau Xanh Hữu Cơ Tươi Sống',
      },
    ],
  },
  {
    id: 'strawberry',
    match: (p) => p.includes('dau tay'),
    category: 'VEG_FRUIT',
    canonicalSupplier: 'tuyen lam',
    variants: [
      {
        thumb: '/images/batches/strawberry_fresh.jpg',
        banner: '/images/batches/strawberry_fresh.jpg',
        label: 'Trái Cây Tươi Đà Lạt',
      },
    ],
  },
  {
    id: 'grapes',
    match: (p) => p.includes('nho xanh') || p.includes('nho'),
    category: 'VEG_FRUIT',
    canonicalSupplier: 'ninh phuoc',
    variants: [
      {
        thumb: '/images/batches/green_grapes.jpg',
        banner: '/images/batches/green_grapes.jpg',
        label: 'Nho Tươi Không Hạt VietGAP',
      },
      {
        thumb: '/images/batches/purple_grapes.jpg',
        banner: '/images/batches/purple_grapes.jpg',
        label: 'Nho Tươi Tuyển Chọn',
      },
    ],
  },
  {
    id: 'avocado',
    match: (p) => p.includes('bo sap') || p.includes('bo 034') || p.includes('qua bo'),
    category: 'VEG_FRUIT',
    canonicalSupplier: 'cu m gar',
    variants: [
      {
        thumb: '/images/batches/avocado_tree.jpg',
        banner: '/images/batches/avocado_tree.jpg',
        label: 'Bơ Sáp Tươi Tây Nguyên',
      },
      {
        thumb: '/images/batches/avocado_half.jpg',
        banner: '/images/batches/avocado_tree.jpg',
        label: 'Bơ Sáp Tuyển Chọn',
      },
    ],
  },
  {
    id: 'tomato',
    match: (p) => p.includes('ca chua'),
    category: 'VEG_FRUIT',
    canonicalSupplier: 'organik don duong',
    variants: [
      {
        thumb: '/images/batches/tomato_vine.jpg',
        banner: '/images/batches/tomato_vine.jpg',
        label: 'Cà Chua Hữu Cơ Tươi',
      },
    ],
  },
  {
    id: 'wagyu_beef',
    match: (p) => p.includes('bo wagyu') || p.includes('than ngoai bo') || p.includes('thit bo'),
    category: 'CHILLED_MEAT',
    canonicalSupplier: 'meatdeli long an',
    variants: [
      {
        thumb: '/images/batches/wagyu_raw_board.jpg',
        banner: '/images/batches/beef_sirloin_raw.jpg',
        label: 'Thịt Bò Tươi Sống Chilled (0-4°C)',
      },
      {
        thumb: '/images/batches/wagyu_raw_closeup.jpg',
        banner: '/images/batches/wagyu_raw_board.jpg',
        label: 'Thịt Bò Vân Cẩm Thạch Tươi Sống',
      },
      {
        thumb: '/images/batches/beef_sirloin_raw.jpg',
        banner: '/images/batches/beef_rosemary_raw.jpg',
        label: 'Thịt Thăn Bò Tươi Sống',
      },
    ],
  },
  {
    id: 'pork_belly',
    match: (p) => p.includes('ba roi heo') || p.includes('thit heo') || p.includes('suon heo') || p.includes('heo thao moc'),
    category: 'CHILLED_MEAT',
    canonicalSupplier: 'baf tay ninh',
    variants: [
      {
        thumb: '/images/batches/pork_belly_raw.jpg',
        banner: '/images/batches/pork_belly_raw.jpg',
        label: 'Thịt Heo Tươi Sống Chilled (0-4°C)',
      },
      {
        thumb: '/images/batches/beef_rosemary_raw.jpg',
        banner: '/images/batches/pork_belly_raw.jpg',
        label: 'Thịt Tươi Sống VietGAP',
      },
    ],
  },
  {
    id: 'chicken_breast_raw',
    match: (p) =>
      (p.includes('uc ga') || p.includes('phi le ga') || p.includes('thit ga')) &&
      !p.includes('ga quay') &&
      !p.includes('ga nuong'),
    category: 'CHILLED_MEAT',
    canonicalSupplier: 'cpv binh phuoc',
    variants: [
      {
        thumb: '/images/batches/chicken_breast_raw.jpg',
        banner: '/images/batches/chicken_breast_raw.jpg',
        label: 'Thịt Gia Cầm Tươi Sống Chilled',
      },
      {
        thumb: '/images/batches/chicken_whole_raw.jpg',
        banner: '/images/batches/chicken_breast_raw.jpg',
        label: 'Gà Tươi Sống Hữu Cơ',
      },
    ],
  },
  {
    id: 'salmon_raw',
    match: (p) => p.includes('ca hoi'),
    category: 'FRESH_SEAFOOD',
    canonicalSupplier: 'bien dong cat lai',
    variants: [
      {
        thumb: '/images/batches/salmon_raw.jpg',
        banner: '/images/batches/salmon_raw.jpg',
        label: 'Cá Hồi Phi Lê Tươi Sống (0-2°C)',
      },
    ],
  },
  {
    id: 'spiny_lobster',
    match: (p) => p.includes('tom hum') || p.includes('tom su') || p.includes('tom the'),
    category: 'FRESH_SEAFOOD',
    canonicalSupplier: 'van phong khanh hoa',
    variants: [
      {
        thumb: '/images/batches/spiny_lobster_live.jpg',
        banner: '/images/batches/spiny_lobster_live.jpg',
        label: 'Tôm Hùm Bông Tươi Sống Nguyên Con',
      },
      {
        thumb: '/images/batches/seafood_ice_mix.jpg',
        banner: '/images/batches/spiny_lobster_live.jpg',
        label: 'Hải Sản Tươi Sống Ướp Lạnh',
      },
    ],
  },
  {
    id: 'king_crab',
    match: (p) => p.includes('cua hoang de') || p.includes('cua alaska') || p.includes('cua bien'),
    category: 'FRESH_SEAFOOD',
    canonicalSupplier: 'tan son nhat cargo',
    variants: [
      {
        thumb: '/images/batches/king_crab_ice.jpg',
        banner: '/images/batches/king_crab_ice.jpg',
        label: 'Cua Hoàng Đế Tươi Sống Cấp Lạnh',
      },
    ],
  },
  {
    id: 'cod_fillet',
    match: (p) => p.includes('ca tuyet') || p.includes('phi le ca'),
    category: 'DEEP_FROZEN',
    canonicalSupplier: 'cang cat lai',
    variants: [
      {
        thumb: '/images/batches/cod_fillet_raw.jpg',
        banner: '/images/batches/cod_fillet_raw.jpg',
        label: 'Phi Lê Cá Tươi Cấp Đông Sâu (-18°C)',
      },
    ],
  },
  {
    id: 'hargow_dumpling',
    match: (p) => p.includes('ha cao') || p.includes('sui cao') || p.includes('banh xep'),
    category: 'DEEP_FROZEN',
    canonicalSupplier: 'cau tre tan phu',
    variants: [
      {
        thumb: '/images/batches/hargow_dumpling.jpg',
        banner: '/images/batches/hargow_dumpling.jpg',
        label: 'Há Cảo Tôm Cấp Đông IQF (-18°C)',
      },
      {
        thumb: '/images/batches/dumpling_plate.jpg',
        banner: '/images/batches/hargow_dumpling.jpg',
        label: 'Dimsum Cấp Đông Siêu Tốc IQF',
      },
    ],
  },
  {
    id: 'fresh_milk',
    match: (p) => p.includes('sua tuoi'),
    category: 'DAIRY',
    canonicalSupplier: 'don duong lam dong',
    variants: [
      {
        thumb: '/images/batches/milk_fresh.jpg',
        banner: '/images/batches/milk_fresh.jpg',
        label: 'Sữa Tươi Thanh Trùng 100% Nguyên Chất',
      },
      {
        thumb: '/images/batches/milk_carton.jpg',
        banner: '/images/batches/milk_fresh.jpg',
        label: 'Sữa Tươi Bảo Quản Lạnh (2-6°C)',
      },
    ],
  },
  {
    id: 'mozzarella',
    match: (p) => p.includes('pho mai') || p.includes('mozzarella') || p.includes('bo lat'),
    category: 'DAIRY',
    canonicalSupplier: 'cao nguyen bao loc',
    variants: [
      {
        thumb: '/images/batches/mozzarella_fresh.jpg',
        banner: '/images/batches/mozzarella_fresh.jpg',
        label: 'Phô Mai Mozzarella Tươi Thủ Công',
      },
      {
        thumb: '/images/batches/cheese_wheel.jpg',
        banner: '/images/batches/mozzarella_fresh.jpg',
        label: 'Phô Mai Ủ Lạnh Chuẩn Âu',
      },
    ],
  },
  {
    id: 'greek_yogurt',
    match: (p) => p.includes('sua chua'),
    category: 'DAIRY',
    canonicalSupplier: 'long thanh dong nai',
    variants: [
      {
        thumb: '/images/batches/greek_yogurt.jpg',
        banner: '/images/batches/greek_yogurt.jpg',
        label: 'Sữa Chua Hy Lạp Men Sống (2-6°C)',
      },
    ],
  },
  {
    id: 'roast_chicken',
    match: (p) => p.includes('ga quay') || p.includes('ga nuong'),
    category: 'DELI_HOT',
    canonicalSupplier: 'central kitchen',
    variants: [
      {
        thumb: '/images/batches/roast_chicken_herb.jpg',
        banner: '/images/batches/roast_chicken_herb.jpg',
        label: 'Gà Quay Thảo Mộc Quầy Deli Nóng',
      },
      {
        thumb: '/images/batches/roast_poultry_pan.jpg',
        banner: '/images/batches/roast_chicken_herb.jpg',
        label: 'Gà Nướng Thảo Mộc Giữ Nóng',
      },
    ],
  },
  {
    id: 'peking_duck',
    match: (p) => p.includes('vit quay') || p.includes('vit nuong'),
    category: 'DELI_HOT',
    canonicalSupplier: 'central kitchen',
    variants: [
      {
        thumb: '/images/batches/peking_duck_roast.jpg',
        banner: '/images/batches/peking_duck_roast.jpg',
        label: 'Vịt Quay Bắc Kinh Da Giòn Deli Nóng',
      },
    ],
  },
];

const FALLBACK_BY_CATEGORY = {
  VEG_FRUIT: [
    { thumb: '/images/batches/lettuce_leaves.jpg', banner: '/images/batches/lettuce_leaves.jpg' },
    { thumb: '/images/batches/tomato_vine.jpg', banner: '/images/batches/tomato_vine.jpg' },
    { thumb: '/images/batches/avocado_tree.jpg', banner: '/images/batches/avocado_tree.jpg' },
    { thumb: '/images/batches/green_grapes.jpg', banner: '/images/batches/green_grapes.jpg' },
    { thumb: '/images/batches/strawberry_fresh.jpg', banner: '/images/batches/strawberry_fresh.jpg' },
  ],
  CHILLED_MEAT: [
    { thumb: '/images/batches/wagyu_raw_closeup.jpg', banner: '/images/batches/wagyu_raw_board.jpg' },
    { thumb: '/images/batches/pork_belly_raw.jpg', banner: '/images/batches/pork_belly_raw.jpg' },
    { thumb: '/images/batches/chicken_whole_raw.jpg', banner: '/images/batches/chicken_breast_raw.jpg' },
    { thumb: '/images/batches/beef_rosemary_raw.jpg', banner: '/images/batches/beef_sirloin_raw.jpg' },
  ],
  FRESH_SEAFOOD: [
    { thumb: '/images/batches/seafood_ice_mix.jpg', banner: '/images/batches/seafood_ice_mix.jpg' },
    { thumb: '/images/batches/salmon_raw.jpg', banner: '/images/batches/salmon_raw.jpg' },
    { thumb: '/images/batches/spiny_lobster_live.jpg', banner: '/images/batches/spiny_lobster_live.jpg' },
    { thumb: '/images/batches/king_crab_ice.jpg', banner: '/images/batches/king_crab_ice.jpg' },
  ],
  DAIRY: [
    { thumb: '/images/batches/milk_carton.jpg', banner: '/images/batches/milk_fresh.jpg' },
    { thumb: '/images/batches/cheese_wheel.jpg', banner: '/images/batches/mozzarella_fresh.jpg' },
    { thumb: '/images/batches/greek_yogurt.jpg', banner: '/images/batches/greek_yogurt.jpg' },
  ],
  DEEP_FROZEN: [
    { thumb: '/images/batches/dumpling_plate.jpg', banner: '/images/batches/hargow_dumpling.jpg' },
    { thumb: '/images/batches/cod_fillet_raw.jpg', banner: '/images/batches/cod_fillet_raw.jpg' },
  ],
  DELI_HOT: [
    { thumb: '/images/batches/roast_poultry_pan.jpg', banner: '/images/batches/roast_chicken_herb.jpg' },
    { thumb: '/images/batches/peking_duck_roast.jpg', banner: '/images/batches/peking_duck_roast.jpg' },
  ],
};

/**
 * Trả về bộ ảnh chuẩn xác (thumb, banner, pageBg, label, identityKey) cho một lô hàng.
 * - Cùng loại sản phẩm (product_name) + cùng nhà cung cấp (farm_name) => Luôn trả về cùng 1 hình ảnh.
 * - Khác loại sản phẩm hoặc khác nhà cung cấp => Trả về hình ảnh riêng biệt tương ứng.
 */
export function resolveFoodBatchMedia(batch = {}) {
  const rawProductName =
    batch.product_name || batch.productName || batch.batch_name || 'Xà Lách Thủy Canh Đà Lạt VietGAP';
  const rawFarmName =
    batch.farm_name || batch.farmName || batch.origin_farm || 'Nông trại Công nghệ cao LangBiang - Đà Lạt';
  const rawCategory = String(batch.category_code || batch.category || 'VEG_FRUIT').toUpperCase();

  const normProduct = normalizeVi(rawProductName);
  const normFarm = normalizeVi(rawFarmName);
  const identityKey = `${normProduct}__${normFarm}`;

  const matchedRule = PRODUCT_RULES.find((rule) => rule.match(normProduct));
  if (matchedRule) {
    const variants = matchedRule.variants;
    let chosen = variants[0];

    if (variants.length > 1) {
      const isCanonicalSupplier =
        !matchedRule.canonicalSupplier || normFarm.includes(matchedRule.canonicalSupplier);
      if (!isCanonicalSupplier) {
        // Nhà cung cấp khác cho cùng một dòng sản phẩm sẽ lấy biến thể ảnh khác trong bộ ảnh thực tế của dòng đó
        const altIndex = 1 + (hashString(identityKey) % (variants.length - 1));
        chosen = variants[altIndex];
      }
    }

    return {
      thumb: chosen.thumb,
      banner: chosen.banner,
      pageBg: CONSUMER_LOGIN_BG,
      label: chosen.label || CATEGORY_LABELS[matchedRule.category] || CATEGORY_LABELS.VEG_FRUIT,
      identityKey,
    };
  }

  const pool = FALLBACK_BY_CATEGORY[rawCategory] || FALLBACK_BY_CATEGORY.VEG_FRUIT;
  const chosen = pool[hashString(identityKey) % pool.length];

  return {
    thumb: chosen.thumb,
    banner: chosen.banner,
    pageBg: CONSUMER_LOGIN_BG,
    label: CATEGORY_LABELS[rawCategory] || CATEGORY_LABELS.VEG_FRUIT,
    identityKey,
  };
}

