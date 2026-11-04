export const EMPERORS_DATA = [
  // ===== 商 =====
  { name: '商汤', era: '商', tags: ['帝王', '开国', '仁君'], stats: { politics: 88, military: 82, strategy: 85, diplomacy: 80, literature: 55, charm: 90 } },
  { name: '太甲', era: '商', tags: ['帝王', '中兴'], stats: { politics: 72, military: 60, strategy: 65, diplomacy: 68, literature: 50, charm: 65 } },
  { name: '武丁', era: '商', tags: ['帝王', '中兴'], stats: { politics: 85, military: 88, strategy: 82, diplomacy: 75, literature: 60, charm: 80 } },
  { name: '帝辛', era: '商', tags: ['帝王', '末代', '暴君'], stats: { politics: 55, military: 75, strategy: 60, diplomacy: 40, literature: 50, charm: 70 } },

  // ===== 西周 =====
  { name: '周文王', era: '西周', tags: ['帝王', '仁君'], stats: { politics: 92, military: 70, strategy: 90, diplomacy: 88, literature: 85, charm: 95 } },
  { name: '周武王', era: '西周', tags: ['帝王', '开国'], stats: { politics: 85, military: 88, strategy: 85, diplomacy: 80, literature: 65, charm: 88 } },
  { name: '周成王', era: '西周', tags: ['帝王'], stats: { politics: 78, military: 65, strategy: 72, diplomacy: 75, literature: 60, charm: 72 } },
  { name: '周康王', era: '西周', tags: ['帝王'], stats: { politics: 75, military: 62, strategy: 70, diplomacy: 72, literature: 58, charm: 70 } },
  { name: '周昭王', era: '西周', tags: ['帝王'], stats: { politics: 60, military: 65, strategy: 55, diplomacy: 58, literature: 45, charm: 55 } },
  { name: '周穆王', era: '西周', tags: ['帝王'], stats: { politics: 68, military: 72, strategy: 65, diplomacy: 70, literature: 55, charm: 75 } },
  { name: '周厉王', era: '西周', tags: ['帝王', '暴君'], stats: { politics: 45, military: 60, strategy: 50, diplomacy: 35, literature: 40, charm: 30 } },
  { name: '周宣王', era: '西周', tags: ['帝王', '中兴'], stats: { politics: 78, military: 75, strategy: 72, diplomacy: 70, literature: 60, charm: 72 } },
  { name: '周幽王', era: '西周', tags: ['帝王', '末代', '暴君'], stats: { politics: 30, military: 35, strategy: 30, diplomacy: 25, literature: 35, charm: 40 } },

  // ===== 东周 =====
  { name: '周平王', era: '东周', tags: ['帝王'], stats: { politics: 60, military: 45, strategy: 55, diplomacy: 62, literature: 50, charm: 55 } },
  { name: '周桓王', era: '东周', tags: ['帝王'], stats: { politics: 50, military: 45, strategy: 48, diplomacy: 50, literature: 45, charm: 48 } },
  { name: '周赧王', era: '东周', tags: ['帝王', '末代'], stats: { politics: 35, military: 25, strategy: 38, diplomacy: 40, literature: 42, charm: 35 } },

  // ===== 春秋 =====
  { name: '齐桓公', era: '春秋', tags: ['帝王', '霸主'], stats: { politics: 88, military: 80, strategy: 82, diplomacy: 90, literature: 55, charm: 85 } },
  { name: '晋文公', era: '春秋', tags: ['帝王', '霸主'], stats: { politics: 85, military: 85, strategy: 88, diplomacy: 82, literature: 60, charm: 82 } },
  { name: '楚庄王', era: '春秋', tags: ['帝王', '霸主'], stats: { politics: 82, military: 85, strategy: 80, diplomacy: 78, literature: 55, charm: 80 } },
  { name: '秦穆公', era: '春秋', tags: ['帝王', '霸主'], stats: { politics: 80, military: 82, strategy: 78, diplomacy: 75, literature: 50, charm: 78 } },
  { name: '宋襄公', era: '春秋', tags: ['帝王', '霸主'], stats: { politics: 55, military: 50, strategy: 45, diplomacy: 60, literature: 50, charm: 55 } },
  { name: '吴王阖闾', era: '春秋', tags: ['帝王', '霸主'], stats: { politics: 75, military: 85, strategy: 80, diplomacy: 65, literature: 45, charm: 72 } },
  { name: '吴王夫差', era: '春秋', tags: ['帝王'], stats: { politics: 55, military: 80, strategy: 60, diplomacy: 50, literature: 45, charm: 65 } },
  { name: '越王勾践', era: '春秋', tags: ['帝王', '霸主'], stats: { politics: 82, military: 78, strategy: 90, diplomacy: 72, literature: 50, charm: 75 } },
  { name: '郑庄公', era: '春秋', tags: ['帝王'], stats: { politics: 78, military: 72, strategy: 80, diplomacy: 70, literature: 50, charm: 68 } },

  // ===== 战国 =====
  { name: '魏文侯', era: '战国', tags: ['帝王'], stats: { politics: 85, military: 70, strategy: 80, diplomacy: 78, literature: 65, charm: 78 } },
  { name: '赵武灵王', era: '战国', tags: ['帝王'], stats: { politics: 72, military: 88, strategy: 78, diplomacy: 60, literature: 45, charm: 75 } },
  { name: '秦孝公', era: '战国', tags: ['帝王'], stats: { politics: 85, military: 72, strategy: 82, diplomacy: 70, literature: 55, charm: 75 } },
  { name: '燕昭王', era: '战国', tags: ['帝王'], stats: { politics: 78, military: 75, strategy: 80, diplomacy: 72, literature: 55, charm: 78 } },
  { name: '齐威王', era: '战国', tags: ['帝王'], stats: { politics: 80, military: 72, strategy: 78, diplomacy: 75, literature: 60, charm: 72 } },

  // ===== 秦 =====
  { name: '秦惠文王', era: '秦', tags: ['帝王'], stats: { politics: 80, military: 78, strategy: 82, diplomacy: 78, literature: 55, charm: 72 } },
  { name: '秦昭襄王', era: '秦', tags: ['帝王'], stats: { politics: 82, military: 85, strategy: 85, diplomacy: 75, literature: 50, charm: 70 } },
  { name: '嬴政', era: '秦', tags: ['帝王', '开国'], stats: { politics: 95, military: 88, strategy: 90, diplomacy: 70, literature: 60, charm: 92 } },
  { name: '胡亥', era: '秦', tags: ['帝王', '末代', '暴君'], stats: { politics: 20, military: 15, strategy: 18, diplomacy: 15, literature: 20, charm: 25 } },

  // ===== 西汉 =====
  { name: '刘邦', era: '西汉', tags: ['帝王', '开国'], stats: { politics: 88, military: 72, strategy: 85, diplomacy: 82, literature: 50, charm: 92 } },
  { name: '刘盈', era: '西汉', tags: ['帝王'], stats: { politics: 50, military: 35, strategy: 45, diplomacy: 55, literature: 50, charm: 55 } },
  { name: '刘恒', era: '西汉', tags: ['帝王', '仁君'], stats: { politics: 90, military: 60, strategy: 80, diplomacy: 82, literature: 65, charm: 85 } },
  { name: '刘启', era: '西汉', tags: ['帝王'], stats: { politics: 82, military: 65, strategy: 75, diplomacy: 72, literature: 55, charm: 70 } },
  { name: '刘彻', era: '西汉', tags: ['帝王'], stats: { politics: 90, military: 88, strategy: 88, diplomacy: 80, literature: 75, charm: 88 } },
  { name: '刘弗陵', era: '西汉', tags: ['帝王'], stats: { politics: 65, military: 50, strategy: 60, diplomacy: 62, literature: 55, charm: 60 } },
  { name: '刘询', era: '西汉', tags: ['帝王', '中兴'], stats: { politics: 88, military: 75, strategy: 82, diplomacy: 80, literature: 65, charm: 78 } },
  { name: '刘奭', era: '西汉', tags: ['帝王'], stats: { politics: 55, military: 40, strategy: 50, diplomacy: 55, literature: 60, charm: 50 } },
  { name: '刘骜', era: '西汉', tags: ['帝王'], stats: { politics: 35, military: 25, strategy: 30, diplomacy: 35, literature: 40, charm: 45 } },
  { name: '刘欣', era: '西汉', tags: ['帝王'], stats: { politics: 30, military: 20, strategy: 28, diplomacy: 30, literature: 35, charm: 40 } },
  { name: '刘衎', era: '西汉', tags: ['帝王', '末代'], stats: { politics: 20, military: 15, strategy: 18, diplomacy: 20, literature: 25, charm: 25 } },
  { name: '王莽', era: '新', tags: ['帝王', '开国'], stats: { politics: 70, military: 45, strategy: 65, diplomacy: 60, literature: 70, charm: 55 } },

  // ===== 东汉 =====
  { name: '刘秀', era: '东汉', tags: ['帝王', '开国', '中兴'], stats: { politics: 92, military: 90, strategy: 90, diplomacy: 85, literature: 70, charm: 92 } },
  { name: '刘庄', era: '东汉', tags: ['帝王'], stats: { politics: 85, military: 72, strategy: 78, diplomacy: 75, literature: 65, charm: 75 } },
  { name: '刘炟', era: '东汉', tags: ['帝王', '仁君'], stats: { politics: 80, military: 65, strategy: 72, diplomacy: 78, literature: 68, charm: 78 } },
  { name: '刘肇', era: '东汉', tags: ['帝王'], stats: { politics: 72, military: 68, strategy: 70, diplomacy: 65, literature: 55, charm: 62 } },
  { name: '刘祜', era: '东汉', tags: ['帝王'], stats: { politics: 45, military: 35, strategy: 42, diplomacy: 45, literature: 40, charm: 42 } },
  { name: '刘保', era: '东汉', tags: ['帝王'], stats: { politics: 50, military: 40, strategy: 48, diplomacy: 50, literature: 45, charm: 48 } },
  { name: '刘志', era: '东汉', tags: ['帝王'], stats: { politics: 40, military: 35, strategy: 38, diplomacy: 40, literature: 35, charm: 38 } },
  { name: '刘宏', era: '东汉', tags: ['帝王', '暴君'], stats: { politics: 25, military: 20, strategy: 22, diplomacy: 25, literature: 30, charm: 35 } },
  { name: '刘协', era: '东汉', tags: ['帝王', '末代'], stats: { politics: 45, military: 30, strategy: 48, diplomacy: 50, literature: 55, charm: 50 } },

  // ===== 三国魏 =====
  { name: '曹操', era: '三国魏', tags: ['帝王', '开国'], stats: { politics: 92, military: 90, strategy: 95, diplomacy: 80, literature: 90, charm: 88 } },
  { name: '曹丕', era: '三国魏', tags: ['帝王', '开国'], stats: { politics: 78, military: 65, strategy: 75, diplomacy: 70, literature: 85, charm: 68 } },
  { name: '曹叡', era: '三国魏', tags: ['帝王'], stats: { politics: 72, military: 68, strategy: 75, diplomacy: 65, literature: 60, charm: 62 } },
  { name: '曹芳', era: '三国魏', tags: ['帝王'], stats: { politics: 30, military: 20, strategy: 28, diplomacy: 30, literature: 30, charm: 30 } },
  { name: '曹髦', era: '三国魏', tags: ['帝王'], stats: { politics: 40, military: 35, strategy: 42, diplomacy: 35, literature: 45, charm: 42 } },
  { name: '曹奂', era: '三国魏', tags: ['帝王', '末代'], stats: { politics: 25, military: 15, strategy: 22, diplomacy: 25, literature: 28, charm: 25 } },

  // ===== 三国蜀 =====
  { name: '刘备', era: '三国蜀', tags: ['帝王', '开国', '仁君'], stats: { politics: 78, military: 72, strategy: 75, diplomacy: 82, literature: 50, charm: 95 } },
  { name: '刘禅', era: '三国蜀', tags: ['帝王', '末代'], stats: { politics: 35, military: 20, strategy: 30, diplomacy: 35, literature: 30, charm: 40 } },

  // ===== 三国吴 =====
  { name: '孙权', era: '三国吴', tags: ['帝王', '开国'], stats: { politics: 85, military: 78, strategy: 85, diplomacy: 88, literature: 60, charm: 80 } },
  { name: '孙亮', era: '三国吴', tags: ['帝王'], stats: { politics: 35, military: 25, strategy: 32, diplomacy: 30, literature: 30, charm: 30 } },
  { name: '孙休', era: '三国吴', tags: ['帝王'], stats: { politics: 55, military: 40, strategy: 50, diplomacy: 52, literature: 55, charm: 50 } },
  { name: '孙皓', era: '三国吴', tags: ['帝王', '末代', '暴君'], stats: { politics: 30, military: 35, strategy: 28, diplomacy: 25, literature: 35, charm: 30 } },

  // ===== 西晋 =====
  { name: '司马炎', era: '西晋', tags: ['帝王', '开国'], stats: { politics: 78, military: 72, strategy: 75, diplomacy: 72, literature: 60, charm: 70 } },
  { name: '司马衷', era: '西晋', tags: ['帝王'], stats: { politics: 10, military: 5, strategy: 8, diplomacy: 10, literature: 10, charm: 15 } },
  { name: '司马炽', era: '西晋', tags: ['帝王'], stats: { politics: 40, military: 30, strategy: 38, diplomacy: 40, literature: 42, charm: 38 } },
  { name: '司马邺', era: '西晋', tags: ['帝王', '末代'], stats: { politics: 30, military: 22, strategy: 28, diplomacy: 30, literature: 32, charm: 28 } },

  // ===== 东晋 =====
  { name: '司马睿', era: '东晋', tags: ['帝王', '开国'], stats: { politics: 68, military: 50, strategy: 62, diplomacy: 70, literature: 55, charm: 62 } },
  { name: '司马绍', era: '东晋', tags: ['帝王'], stats: { politics: 70, military: 62, strategy: 68, diplomacy: 65, literature: 58, charm: 65 } },
  { name: '司马衍', era: '东晋', tags: ['帝王'], stats: { politics: 50, military: 40, strategy: 48, diplomacy: 50, literature: 48, charm: 48 } },
  { name: '司马聃', era: '东晋', tags: ['帝王'], stats: { politics: 45, military: 35, strategy: 42, diplomacy: 45, literature: 42, charm: 42 } },
  { name: '司马昱', era: '东晋', tags: ['帝王'], stats: { politics: 55, military: 30, strategy: 50, diplomacy: 58, literature: 60, charm: 55 } },
  { name: '司马曜', era: '东晋', tags: ['帝王'], stats: { politics: 55, military: 45, strategy: 52, diplomacy: 55, literature: 50, charm: 50 } },
  { name: '司马德宗', era: '东晋', tags: ['帝王'], stats: { politics: 12, military: 8, strategy: 10, diplomacy: 12, literature: 10, charm: 12 } },
  { name: '司马德文', era: '东晋', tags: ['帝王', '末代'], stats: { politics: 25, military: 15, strategy: 22, diplomacy: 25, literature: 28, charm: 22 } },

  // ===== 南朝宋 =====
  { name: '刘裕', era: '南朝宋', tags: ['帝王', '开国'], stats: { politics: 82, military: 92, strategy: 88, diplomacy: 70, literature: 45, charm: 80 } },
  { name: '刘义隆', era: '南朝宋', tags: ['帝王'], stats: { politics: 75, military: 55, strategy: 65, diplomacy: 68, literature: 65, charm: 65 } },
  { name: '刘骏', era: '南朝宋', tags: ['帝王'], stats: { politics: 60, military: 55, strategy: 58, diplomacy: 52, literature: 55, charm: 50 } },
  { name: '刘彧', era: '南朝宋', tags: ['帝王'], stats: { politics: 50, military: 45, strategy: 52, diplomacy: 48, literature: 48, charm: 42 } },
  { name: '刘昱', era: '南朝宋', tags: ['帝王', '暴君'], stats: { politics: 15, military: 12, strategy: 12, diplomacy: 10, literature: 12, charm: 15 } },
  { name: '刘准', era: '南朝宋', tags: ['帝王', '末代'], stats: { politics: 20, military: 12, strategy: 18, diplomacy: 20, literature: 22, charm: 18 } },

  // ===== 南朝齐 =====
  { name: '萧道成', era: '南朝齐', tags: ['帝王', '开国'], stats: { politics: 78, military: 80, strategy: 78, diplomacy: 70, literature: 55, charm: 72 } },
  { name: '萧赜', era: '南朝齐', tags: ['帝王'], stats: { politics: 72, military: 60, strategy: 68, diplomacy: 68, literature: 60, charm: 65 } },
  { name: '萧鸾', era: '南朝齐', tags: ['帝王'], stats: { politics: 60, military: 55, strategy: 62, diplomacy: 55, literature: 50, charm: 48 } },
  { name: '萧宝卷', era: '南朝齐', tags: ['帝王', '末代', '暴君'], stats: { politics: 15, military: 18, strategy: 12, diplomacy: 10, literature: 12, charm: 15 } },

  // ===== 南朝梁 =====
  { name: '萧衍', era: '南朝梁', tags: ['帝王', '开国'], stats: { politics: 80, military: 78, strategy: 82, diplomacy: 72, literature: 85, charm: 78 } },
  { name: '萧纲', era: '南朝梁', tags: ['帝王'], stats: { politics: 40, military: 25, strategy: 38, diplomacy: 40, literature: 75, charm: 45 } },
  { name: '萧绎', era: '南朝梁', tags: ['帝王'], stats: { politics: 55, military: 50, strategy: 58, diplomacy: 48, literature: 78, charm: 50 } },
  { name: '萧方智', era: '南朝梁', tags: ['帝王', '末代'], stats: { politics: 18, military: 10, strategy: 15, diplomacy: 18, literature: 20, charm: 15 } },

  // ===== 南朝陈 =====
  { name: '陈霸先', era: '南朝陈', tags: ['帝王', '开国'], stats: { politics: 78, military: 88, strategy: 82, diplomacy: 68, literature: 45, charm: 75 } },
  { name: '陈蒨', era: '南朝陈', tags: ['帝王'], stats: { politics: 72, military: 65, strategy: 68, diplomacy: 65, literature: 55, charm: 65 } },
  { name: '陈顼', era: '南朝陈', tags: ['帝王'], stats: { politics: 65, military: 62, strategy: 62, diplomacy: 60, literature: 52, charm: 58 } },
  { name: '陈叔宝', era: '南朝陈', tags: ['帝王', '末代'], stats: { politics: 25, military: 15, strategy: 22, diplomacy: 25, literature: 72, charm: 45 } },

  // ===== 北魏 =====
  { name: '拓跋珪', era: '北魏', tags: ['帝王', '开国'], stats: { politics: 75, military: 88, strategy: 82, diplomacy: 65, literature: 40, charm: 72 } },
  { name: '拓跋焘', era: '北魏', tags: ['帝王'], stats: { politics: 80, military: 90, strategy: 85, diplomacy: 68, literature: 45, charm: 75 } },
  { name: '拓跋宏', era: '北魏', tags: ['帝王', '仁君'], stats: { politics: 90, military: 65, strategy: 82, diplomacy: 80, literature: 75, charm: 82 } },
  { name: '元恪', era: '北魏', tags: ['帝王'], stats: { politics: 60, military: 55, strategy: 58, diplomacy: 58, literature: 55, charm: 55 } },
  { name: '元诩', era: '北魏', tags: ['帝王'], stats: { politics: 35, military: 25, strategy: 32, diplomacy: 35, literature: 35, charm: 32 } },

  // ===== 北齐 =====
  { name: '高洋', era: '北齐', tags: ['帝王', '开国'], stats: { politics: 65, military: 82, strategy: 72, diplomacy: 55, literature: 40, charm: 60 } },
  { name: '高纬', era: '北齐', tags: ['帝王', '末代', '暴君'], stats: { politics: 20, military: 22, strategy: 18, diplomacy: 18, literature: 30, charm: 25 } },

  // ===== 北周 =====
  { name: '宇文觉', era: '北周', tags: ['帝王', '开国'], stats: { politics: 40, military: 35, strategy: 38, diplomacy: 38, literature: 35, charm: 35 } },
  { name: '宇文邕', era: '北周', tags: ['帝王'], stats: { politics: 82, military: 85, strategy: 82, diplomacy: 72, literature: 55, charm: 75 } },
  { name: '宇文赟', era: '北周', tags: ['帝王', '暴君'], stats: { politics: 20, military: 18, strategy: 15, diplomacy: 15, literature: 18, charm: 20 } },

  // ===== 隋 =====
  { name: '杨坚', era: '隋', tags: ['帝王', '开国'], stats: { politics: 92, military: 82, strategy: 88, diplomacy: 80, literature: 60, charm: 82 } },
  { name: '杨广', era: '隋', tags: ['帝王', '末代'], stats: { politics: 65, military: 70, strategy: 68, diplomacy: 55, literature: 80, charm: 65 } },
  { name: '杨侑', era: '隋', tags: ['帝王', '末代'], stats: { politics: 15, military: 10, strategy: 12, diplomacy: 15, literature: 18, charm: 12 } },

  // ===== 唐 =====
  { name: '李渊', era: '唐', tags: ['帝王', '开国'], stats: { politics: 80, military: 75, strategy: 78, diplomacy: 75, literature: 55, charm: 72 } },
  { name: '李世民', era: '唐', tags: ['帝王', '仁君'], stats: { politics: 95, military: 95, strategy: 95, diplomacy: 88, literature: 80, charm: 95 } },
  { name: '李治', era: '唐', tags: ['帝王'], stats: { politics: 72, military: 60, strategy: 65, diplomacy: 68, literature: 60, charm: 62 } },
  { name: '武则天', era: '武周', tags: ['帝王', '开国'], stats: { politics: 92, military: 72, strategy: 90, diplomacy: 82, literature: 78, charm: 88 } },
  { name: '李显', era: '唐', tags: ['帝王'], stats: { politics: 40, military: 30, strategy: 38, diplomacy: 42, literature: 38, charm: 40 } },
  { name: '李旦', era: '唐', tags: ['帝王'], stats: { politics: 50, military: 35, strategy: 48, diplomacy: 52, literature: 48, charm: 48 } },
  { name: '李隆基', era: '唐', tags: ['帝王'], stats: { politics: 88, military: 78, strategy: 82, diplomacy: 75, literature: 82, charm: 85 } },
  { name: '李亨', era: '唐', tags: ['帝王', '中兴'], stats: { politics: 62, military: 58, strategy: 60, diplomacy: 58, literature: 50, charm: 55 } },
  { name: '李豫', era: '唐', tags: ['帝王'], stats: { politics: 65, military: 55, strategy: 62, diplomacy: 62, literature: 55, charm: 58 } },
  { name: '李适', era: '唐', tags: ['帝王'], stats: { politics: 60, military: 55, strategy: 58, diplomacy: 55, literature: 52, charm: 52 } },
  { name: '李纯', era: '唐', tags: ['帝王', '中兴'], stats: { politics: 78, military: 72, strategy: 75, diplomacy: 68, literature: 58, charm: 70 } },
  { name: '李恒', era: '唐', tags: ['帝王'], stats: { politics: 40, military: 30, strategy: 38, diplomacy: 40, literature: 42, charm: 38 } },
  { name: '李昂', era: '唐', tags: ['帝王'], stats: { politics: 50, military: 35, strategy: 48, diplomacy: 48, literature: 55, charm: 45 } },
  { name: '李炎', era: '唐', tags: ['帝王'], stats: { politics: 65, military: 60, strategy: 62, diplomacy: 58, literature: 50, charm: 58 } },
  { name: '李忱', era: '唐', tags: ['帝王', '中兴'], stats: { politics: 78, military: 65, strategy: 75, diplomacy: 70, literature: 60, charm: 72 } },
  { name: '李儇', era: '唐', tags: ['帝王'], stats: { politics: 25, military: 20, strategy: 22, diplomacy: 25, literature: 28, charm: 30 } },
  { name: '李晔', era: '唐', tags: ['帝王'], stats: { politics: 40, military: 35, strategy: 42, diplomacy: 38, literature: 42, charm: 40 } },
  { name: '李柷', era: '唐', tags: ['帝王', '末代'], stats: { politics: 15, military: 10, strategy: 12, diplomacy: 15, literature: 18, charm: 12 } },

  // ===== 五代后梁 =====
  { name: '朱温', era: '五代后梁', tags: ['帝王', '开国'], stats: { politics: 72, military: 82, strategy: 78, diplomacy: 60, literature: 35, charm: 62 } },
  { name: '朱友贞', era: '五代后梁', tags: ['帝王', '末代'], stats: { politics: 40, military: 38, strategy: 38, diplomacy: 35, literature: 32, charm: 35 } },

  // ===== 五代后唐 =====
  { name: '李存勖', era: '五代后唐', tags: ['帝王', '开国'], stats: { politics: 60, military: 92, strategy: 82, diplomacy: 55, literature: 50, charm: 72 } },
  { name: '李嗣源', era: '五代后唐', tags: ['帝王', '仁君'], stats: { politics: 75, military: 80, strategy: 72, diplomacy: 65, literature: 42, charm: 70 } },
  { name: '李从珂', era: '五代后唐', tags: ['帝王', '末代'], stats: { politics: 45, military: 55, strategy: 45, diplomacy: 40, literature: 35, charm: 42 } },

  // ===== 五代后晋 =====
  { name: '石敬瑭', era: '五代后晋', tags: ['帝王', '开国'], stats: { politics: 55, military: 68, strategy: 60, diplomacy: 35, literature: 35, charm: 45 } },
  { name: '石重贵', era: '五代后晋', tags: ['帝王', '末代'], stats: { politics: 35, military: 40, strategy: 32, diplomacy: 30, literature: 30, charm: 32 } },

  // ===== 五代后汉 =====
  { name: '刘知远', era: '五代后汉', tags: ['帝王', '开国'], stats: { politics: 62, military: 75, strategy: 68, diplomacy: 55, literature: 35, charm: 58 } },
  { name: '刘承祐', era: '五代后汉', tags: ['帝王', '末代'], stats: { politics: 25, military: 22, strategy: 22, diplomacy: 20, literature: 22, charm: 22 } },

  // ===== 五代后周 =====
  { name: '郭威', era: '五代后周', tags: ['帝王', '开国', '仁君'], stats: { politics: 78, military: 80, strategy: 75, diplomacy: 68, literature: 42, charm: 72 } },
  { name: '柴荣', era: '五代后周', tags: ['帝王'], stats: { politics: 85, military: 88, strategy: 85, diplomacy: 72, literature: 55, charm: 80 } },

  // ===== 北宋 =====
  { name: '赵匡胤', era: '北宋', tags: ['帝王', '开国'], stats: { politics: 88, military: 90, strategy: 88, diplomacy: 80, literature: 55, charm: 88 } },
  { name: '赵光义', era: '北宋', tags: ['帝王'], stats: { politics: 78, military: 65, strategy: 72, diplomacy: 70, literature: 65, charm: 65 } },
  { name: '赵恒', era: '北宋', tags: ['帝王'], stats: { politics: 65, military: 45, strategy: 58, diplomacy: 62, literature: 60, charm: 58 } },
  { name: '赵祯', era: '北宋', tags: ['帝王', '仁君'], stats: { politics: 85, military: 55, strategy: 72, diplomacy: 80, literature: 70, charm: 88 } },
  { name: '赵曙', era: '北宋', tags: ['帝王'], stats: { politics: 60, military: 40, strategy: 55, diplomacy: 58, literature: 58, charm: 55 } },
  { name: '赵顼', era: '北宋', tags: ['帝王'], stats: { politics: 78, military: 62, strategy: 72, diplomacy: 65, literature: 62, charm: 68 } },
  { name: '赵煦', era: '北宋', tags: ['帝王'], stats: { politics: 68, military: 60, strategy: 65, diplomacy: 60, literature: 58, charm: 60 } },
  { name: '赵佶', era: '北宋', tags: ['帝王'], stats: { politics: 35, military: 25, strategy: 30, diplomacy: 35, literature: 92, charm: 65 } },
  { name: '赵桓', era: '北宋', tags: ['帝王', '末代'], stats: { politics: 25, military: 18, strategy: 22, diplomacy: 25, literature: 30, charm: 25 } },

  // ===== 南宋 =====
  { name: '赵构', era: '南宋', tags: ['帝王', '开国'], stats: { politics: 65, military: 45, strategy: 62, diplomacy: 58, literature: 65, charm: 55 } },
  { name: '赵昚', era: '南宋', tags: ['帝王', '仁君'], stats: { politics: 78, military: 62, strategy: 72, diplomacy: 70, literature: 65, charm: 72 } },
  { name: '赵惇', era: '南宋', tags: ['帝王'], stats: { politics: 35, military: 25, strategy: 32, diplomacy: 35, literature: 38, charm: 32 } },
  { name: '赵扩', era: '南宋', tags: ['帝王'], stats: { politics: 50, military: 38, strategy: 48, diplomacy: 50, literature: 52, charm: 48 } },
  { name: '赵昀', era: '南宋', tags: ['帝王'], stats: { politics: 55, military: 42, strategy: 52, diplomacy: 52, literature: 50, charm: 50 } },
  { name: '赵禥', era: '南宋', tags: ['帝王'], stats: { politics: 25, military: 15, strategy: 22, diplomacy: 25, literature: 28, charm: 22 } },
  { name: '赵㬎', era: '南宋', tags: ['帝王', '末代'], stats: { politics: 12, military: 8, strategy: 10, diplomacy: 12, literature: 15, charm: 10 } },
  { name: '赵昰', era: '南宋', tags: ['帝王', '末代'], stats: { politics: 15, military: 10, strategy: 12, diplomacy: 15, literature: 15, charm: 12 } },
  { name: '赵昺', era: '南宋', tags: ['帝王', '末代'], stats: { politics: 10, military: 8, strategy: 8, diplomacy: 10, literature: 10, charm: 10 } },

  // ===== 辽 =====
  { name: '耶律阿保机', era: '辽', tags: ['帝王', '开国'], stats: { politics: 82, military: 90, strategy: 85, diplomacy: 72, literature: 45, charm: 80 } },
  { name: '耶律德光', era: '辽', tags: ['帝王'], stats: { politics: 72, military: 82, strategy: 78, diplomacy: 68, literature: 42, charm: 68 } },
  { name: '耶律隆绪', era: '辽', tags: ['帝王'], stats: { politics: 80, military: 75, strategy: 78, diplomacy: 78, literature: 60, charm: 75 } },
  { name: '耶律宗真', era: '辽', tags: ['帝王'], stats: { politics: 62, military: 60, strategy: 58, diplomacy: 60, literature: 55, charm: 58 } },
  { name: '耶律洪基', era: '辽', tags: ['帝王'], stats: { politics: 50, military: 45, strategy: 48, diplomacy: 50, literature: 52, charm: 48 } },
  { name: '耶律延禧', era: '辽', tags: ['帝王', '末代'], stats: { politics: 25, military: 28, strategy: 22, diplomacy: 22, literature: 25, charm: 25 } },

  // ===== 金 =====
  { name: '完颜阿骨打', era: '金', tags: ['帝王', '开国'], stats: { politics: 78, military: 92, strategy: 85, diplomacy: 68, literature: 40, charm: 82 } },
  { name: '完颜晟', era: '金', tags: ['帝王'], stats: { politics: 72, military: 85, strategy: 78, diplomacy: 65, literature: 38, charm: 68 } },
  { name: '完颜亶', era: '金', tags: ['帝王'], stats: { politics: 55, military: 50, strategy: 52, diplomacy: 50, literature: 48, charm: 48 } },
  { name: '完颜亮', era: '金', tags: ['帝王', '暴君'], stats: { politics: 68, military: 75, strategy: 70, diplomacy: 45, literature: 65, charm: 55 } },
  { name: '完颜雍', era: '金', tags: ['帝王', '仁君'], stats: { politics: 85, military: 70, strategy: 78, diplomacy: 75, literature: 58, charm: 78 } },
  { name: '完颜璟', era: '金', tags: ['帝王'], stats: { politics: 68, military: 55, strategy: 62, diplomacy: 62, literature: 72, charm: 62 } },
  { name: '完颜珣', era: '金', tags: ['帝王'], stats: { politics: 45, military: 42, strategy: 42, diplomacy: 42, literature: 40, charm: 40 } },
  { name: '完颜守绪', era: '金', tags: ['帝王', '末代'], stats: { politics: 50, military: 48, strategy: 48, diplomacy: 42, literature: 45, charm: 45 } },

  // ===== 西夏 =====
  { name: '李元昊', era: '西夏', tags: ['帝王', '开国'], stats: { politics: 78, military: 88, strategy: 82, diplomacy: 65, literature: 55, charm: 75 } },
  { name: '李仁孝', era: '西夏', tags: ['帝王', '仁君'], stats: { politics: 78, military: 55, strategy: 70, diplomacy: 72, literature: 68, charm: 72 } },
  { name: '李睍', era: '西夏', tags: ['帝王', '末代'], stats: { politics: 30, military: 28, strategy: 28, diplomacy: 25, literature: 28, charm: 25 } },

  // ===== 元 =====
  { name: '铁木真', era: '元', tags: ['帝王', '开国'], stats: { politics: 85, military: 98, strategy: 95, diplomacy: 75, literature: 35, charm: 92 } },
  { name: '窝阔台', era: '元', tags: ['帝王'], stats: { politics: 75, military: 82, strategy: 78, diplomacy: 72, literature: 35, charm: 70 } },
  { name: '蒙哥', era: '元', tags: ['帝王'], stats: { politics: 68, military: 85, strategy: 78, diplomacy: 62, literature: 32, charm: 65 } },
  { name: '忽必烈', era: '元', tags: ['帝王', '开国'], stats: { politics: 88, military: 85, strategy: 88, diplomacy: 80, literature: 55, charm: 82 } },
  { name: '铁穆耳', era: '元', tags: ['帝王'], stats: { politics: 62, military: 55, strategy: 58, diplomacy: 60, literature: 42, charm: 55 } },
  { name: '海山', era: '元', tags: ['帝王'], stats: { politics: 55, military: 68, strategy: 58, diplomacy: 52, literature: 35, charm: 55 } },
  { name: '爱育黎拔力八达', era: '元', tags: ['帝王', '仁君'], stats: { politics: 72, military: 50, strategy: 65, diplomacy: 68, literature: 60, charm: 65 } },
  { name: '硕德八剌', era: '元', tags: ['帝王'], stats: { politics: 55, military: 42, strategy: 52, diplomacy: 52, literature: 48, charm: 50 } },
  { name: '图帖睦尔', era: '元', tags: ['帝王'], stats: { politics: 58, military: 45, strategy: 55, diplomacy: 55, literature: 62, charm: 55 } },
  { name: '妥懽帖睦尔', era: '元', tags: ['帝王', '末代'], stats: { politics: 35, military: 30, strategy: 32, diplomacy: 32, literature: 38, charm: 35 } },

  // ===== 明 =====
  { name: '朱元璋', era: '明', tags: ['帝王', '开国'], stats: { politics: 92, military: 92, strategy: 92, diplomacy: 72, literature: 55, charm: 85 } },
  { name: '朱允炆', era: '明', tags: ['帝王'], stats: { politics: 55, military: 35, strategy: 48, diplomacy: 55, literature: 62, charm: 55 } },
  { name: '朱棣', era: '明', tags: ['帝王'], stats: { politics: 88, military: 90, strategy: 88, diplomacy: 78, literature: 60, charm: 85 } },
  { name: '朱高炽', era: '明', tags: ['帝王', '仁君'], stats: { politics: 82, military: 45, strategy: 72, diplomacy: 75, literature: 68, charm: 72 } },
  { name: '朱瞻基', era: '明', tags: ['帝王'], stats: { politics: 82, military: 72, strategy: 78, diplomacy: 72, literature: 65, charm: 75 } },
  { name: '朱祁镇', era: '明', tags: ['帝王'], stats: { politics: 42, military: 35, strategy: 38, diplomacy: 42, literature: 40, charm: 45 } },
  { name: '朱祁钰', era: '明', tags: ['帝王'], stats: { politics: 62, military: 55, strategy: 58, diplomacy: 58, literature: 50, charm: 55 } },
  { name: '朱见深', era: '明', tags: ['帝王'], stats: { politics: 58, military: 48, strategy: 55, diplomacy: 55, literature: 52, charm: 50 } },
  { name: '朱祐樘', era: '明', tags: ['帝王', '仁君'], stats: { politics: 82, military: 55, strategy: 72, diplomacy: 75, literature: 62, charm: 78 } },
  { name: '朱厚照', era: '明', tags: ['帝王'], stats: { politics: 40, military: 62, strategy: 45, diplomacy: 38, literature: 42, charm: 55 } },
  { name: '朱厚熜', era: '明', tags: ['帝王'], stats: { politics: 68, military: 45, strategy: 72, diplomacy: 55, literature: 58, charm: 52 } },
  { name: '朱载坖', era: '明', tags: ['帝王'], stats: { politics: 55, military: 40, strategy: 50, diplomacy: 52, literature: 50, charm: 48 } },
  { name: '朱翊钧', era: '明', tags: ['帝王'], stats: { politics: 50, military: 42, strategy: 52, diplomacy: 48, literature: 50, charm: 45 } },
  { name: '朱常洛', era: '明', tags: ['帝王'], stats: { politics: 35, military: 20, strategy: 32, diplomacy: 35, literature: 38, charm: 32 } },
  { name: '朱由校', era: '明', tags: ['帝王'], stats: { politics: 25, military: 18, strategy: 22, diplomacy: 22, literature: 30, charm: 30 } },
  { name: '朱由检', era: '明', tags: ['帝王', '末代'], stats: { politics: 62, military: 48, strategy: 58, diplomacy: 45, literature: 52, charm: 55 } },

  // ===== 清 =====
  { name: '努尔哈赤', era: '清', tags: ['帝王', '开国'], stats: { politics: 80, military: 92, strategy: 88, diplomacy: 70, literature: 40, charm: 82 } },
  { name: '皇太极', era: '清', tags: ['帝王', '开国'], stats: { politics: 88, military: 88, strategy: 90, diplomacy: 82, literature: 55, charm: 82 } },
  { name: '福临', era: '清', tags: ['帝王'], stats: { politics: 60, military: 42, strategy: 55, diplomacy: 58, literature: 62, charm: 58 } },
  { name: '玄烨', era: '清', tags: ['帝王'], stats: { politics: 92, military: 85, strategy: 90, diplomacy: 85, literature: 78, charm: 90 } },
  { name: '胤禛', era: '清', tags: ['帝王'], stats: { politics: 95, military: 70, strategy: 88, diplomacy: 78, literature: 72, charm: 72 } },
  { name: '弘历', era: '清', tags: ['帝王'], stats: { politics: 85, military: 78, strategy: 82, diplomacy: 80, literature: 82, charm: 85 } },
  { name: '颙琰', era: '清', tags: ['帝王'], stats: { politics: 62, military: 45, strategy: 58, diplomacy: 58, literature: 55, charm: 55 } },
  { name: '旻宁', era: '清', tags: ['帝王'], stats: { politics: 55, military: 42, strategy: 52, diplomacy: 48, literature: 52, charm: 50 } },
  { name: '奕詝', era: '清', tags: ['帝王'], stats: { politics: 45, military: 35, strategy: 42, diplomacy: 40, literature: 48, charm: 42 } },
  { name: '载淳', era: '清', tags: ['帝王'], stats: { politics: 30, military: 20, strategy: 28, diplomacy: 30, literature: 32, charm: 30 } },
  { name: '载湉', era: '清', tags: ['帝王'], stats: { politics: 55, military: 30, strategy: 52, diplomacy: 50, literature: 58, charm: 52 } },
  { name: '溥仪', era: '清', tags: ['帝王', '末代'], stats: { politics: 20, military: 10, strategy: 18, diplomacy: 22, literature: 30, charm: 25 } },
];
