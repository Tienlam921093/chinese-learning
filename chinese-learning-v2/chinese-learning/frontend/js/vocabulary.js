// Auth utilities (getToken, getUser, getProgressKey, API_BASE, authFetch) provided by helpers.js


/**
 * FLASHCARD ENGINE
 * - Tải từ vựng từ API hoặc demo data
 * - Flip animation CSS 3D
 * - Spaced Repetition rating
 * - Web Speech API phát âm
 */

const TONES = { 1:'#4CAF50', 2:'#2196F3', 3:'#FF9800', 4:'#e63946', 0:'#9E9E9E' };

// Từ vựng đầy đủ theo từng bài lesson, phân cấp HSK 1-6
const DEMO_VOCAB = [
  // ── HSK 1 · Bài 1: Chào Hỏi Cơ Bản ──
  { id:101, hsk:1, lesson_id:1, hanzi:'你好',   pinyin:'nǐ hǎo',      meaning:'Xin chào',          example:'你好！我是小明。',       example_meaning:'Xin chào! Tôi là Tiểu Minh.',    tone:3 },
  { id:102, hsk:1, lesson_id:1, hanzi:'谢谢',   pinyin:'xiè xie',     meaning:'Cảm ơn',            example:'谢谢你的帮助！',         example_meaning:'Cảm ơn bạn đã giúp!',            tone:4 },
  { id:103, hsk:1, lesson_id:1, hanzi:'对不起', pinyin:'duì bu qǐ',   meaning:'Xin lỗi',           example:'对不起，我迟到了。',      example_meaning:'Xin lỗi, tôi đến trễ.',          tone:4 },
  { id:104, hsk:1, lesson_id:1, hanzi:'再见',   pinyin:'zài jiàn',    meaning:'Tạm biệt',          example:'再见！明天见！',          example_meaning:'Tạm biệt! Hẹn ngày mai!',        tone:4 },
  { id:105, hsk:1, lesson_id:1, hanzi:'你',     pinyin:'nǐ',          meaning:'Bạn / Anh / Chị',   example:'你是学生吗？',           example_meaning:'Bạn có phải học sinh không?',    tone:3 },
  { id:106, hsk:1, lesson_id:1, hanzi:'我',     pinyin:'wǒ',          meaning:'Tôi',               example:'我是越南人。',           example_meaning:'Tôi là người Việt Nam.',          tone:3 },
  { id:107, hsk:1, lesson_id:1, hanzi:'是',     pinyin:'shì',         meaning:'Là (động từ)',      example:'他是老师。',             example_meaning:'Anh ấy là giáo viên.',            tone:4 },
  { id:108, hsk:1, lesson_id:1, hanzi:'不',     pinyin:'bù',          meaning:'Không',             example:'我不是学生。',           example_meaning:'Tôi không phải học sinh.',        tone:4 },
  { id:109, hsk:1, lesson_id:1, hanzi:'吗',     pinyin:'ma',          meaning:'Trợ từ nghi vấn',   example:'你好吗？',               example_meaning:'Bạn có khỏe không?',             tone:0 },
  { id:110, hsk:1, lesson_id:1, hanzi:'好',     pinyin:'hǎo',         meaning:'Tốt / Khỏe',        example:'我很好，谢谢！',         example_meaning:'Tôi khỏe, cảm ơn!',             tone:3 },
  { id:111, hsk:1, lesson_id:1, hanzi:'请',     pinyin:'qǐng',        meaning:'Xin / Mời',         example:'请坐。',                 example_meaning:'Mời ngồi.',                       tone:3 },
  { id:112, hsk:1, lesson_id:1, hanzi:'没关系', pinyin:'méi guān xi', meaning:'Không sao',         example:'没关系，不用谢。',        example_meaning:'Không sao, không cần cảm ơn.',   tone:2 },

  // ── HSK 1 · Bài 2: Số Đếm 1-10 ──
  { id:201, hsk:1, lesson_id:2, hanzi:'一', pinyin:'yī',  meaning:'Một',   example:'一个苹果。',    example_meaning:'Một quả táo.',      tone:1 },
  { id:202, hsk:1, lesson_id:2, hanzi:'二', pinyin:'èr',  meaning:'Hai',   example:'两个人。',      example_meaning:'Hai người.',        tone:4 },
  { id:203, hsk:1, lesson_id:2, hanzi:'三', pinyin:'sān', meaning:'Ba',    example:'三个朋友。',    example_meaning:'Ba người bạn.',     tone:1 },
  { id:204, hsk:1, lesson_id:2, hanzi:'四', pinyin:'sì',  meaning:'Bốn',   example:'四本书。',      example_meaning:'Bốn quyển sách.',  tone:4 },
  { id:205, hsk:1, lesson_id:2, hanzi:'五', pinyin:'wǔ',  meaning:'Năm',   example:'五个学生。',    example_meaning:'Năm học sinh.',     tone:3 },
  { id:206, hsk:1, lesson_id:2, hanzi:'六', pinyin:'liù', meaning:'Sáu',   example:'六点钟。',      example_meaning:'Sáu giờ.',         tone:4 },
  { id:207, hsk:1, lesson_id:2, hanzi:'七', pinyin:'qī',  meaning:'Bảy',   example:'七天。',        example_meaning:'Bảy ngày.',        tone:1 },
  { id:208, hsk:1, lesson_id:2, hanzi:'八', pinyin:'bā',  meaning:'Tám',   example:'八月。',        example_meaning:'Tháng tám.',       tone:1 },
  { id:209, hsk:1, lesson_id:2, hanzi:'九', pinyin:'jiǔ', meaning:'Chín',  example:'九个月。',      example_meaning:'Chín tháng.',      tone:3 },
  { id:210, hsk:1, lesson_id:2, hanzi:'十', pinyin:'shí', meaning:'Mười',  example:'十分钟。',      example_meaning:'Mười phút.',       tone:2 },

  // ── HSK 1 · Bài 3: Màu Sắc ──
  { id:301, hsk:1, lesson_id:3, hanzi:'红色', pinyin:'hóng sè',  meaning:'Màu đỏ',        example:'这是红色的花。',  example_meaning:'Đây là hoa màu đỏ.',      tone:2 },
  { id:302, hsk:1, lesson_id:3, hanzi:'蓝色', pinyin:'lán sè',   meaning:'Màu xanh lam',  example:'天空是蓝色的。', example_meaning:'Bầu trời màu xanh lam.',  tone:2 },
  { id:303, hsk:1, lesson_id:3, hanzi:'绿色', pinyin:'lǜ sè',    meaning:'Màu xanh lá',   example:'草是绿色的。',   example_meaning:'Cỏ màu xanh lá.',        tone:4 },
  { id:304, hsk:1, lesson_id:3, hanzi:'黄色', pinyin:'huáng sè', meaning:'Màu vàng',      example:'香蕉是黄色的。', example_meaning:'Chuối màu vàng.',         tone:2 },
  { id:305, hsk:1, lesson_id:3, hanzi:'白色', pinyin:'bái sè',   meaning:'Màu trắng',     example:'雪是白色的。',   example_meaning:'Tuyết màu trắng.',        tone:2 },
  { id:306, hsk:1, lesson_id:3, hanzi:'黑色', pinyin:'hēi sè',   meaning:'Màu đen',       example:'夜晚是黑色的。', example_meaning:'Đêm tối màu đen.',        tone:1 },
  { id:307, hsk:1, lesson_id:3, hanzi:'颜色', pinyin:'yán sè',   meaning:'Màu sắc',       example:'你喜欢什么颜色？',example_meaning:'Bạn thích màu gì?',       tone:2 },
  { id:308, hsk:1, lesson_id:3, hanzi:'粉色', pinyin:'fěn sè',   meaning:'Màu hồng',      example:'她喜欢粉色。',   example_meaning:'Cô ấy thích màu hồng.',  tone:3 },

  // ── HSK 1 · Bài 4: Gia Đình ──
  { id:401, hsk:1, lesson_id:4, hanzi:'爸爸', pinyin:'bà ba',    meaning:'Bố',            example:'我爸爸是医生。',  example_meaning:'Bố tôi là bác sĩ.',       tone:4 },
  { id:402, hsk:1, lesson_id:4, hanzi:'妈妈', pinyin:'mā ma',    meaning:'Mẹ',            example:'我妈妈是老师。',  example_meaning:'Mẹ tôi là giáo viên.',    tone:1 },
  { id:403, hsk:1, lesson_id:4, hanzi:'哥哥', pinyin:'gē ge',    meaning:'Anh trai',      example:'我哥哥很高。',    example_meaning:'Anh trai tôi rất cao.',   tone:1 },
  { id:404, hsk:1, lesson_id:4, hanzi:'姐姐', pinyin:'jiě jie',  meaning:'Chị gái',       example:'姐姐在学校。',    example_meaning:'Chị gái ở trường.',       tone:3 },
  { id:405, hsk:1, lesson_id:4, hanzi:'弟弟', pinyin:'dì di',    meaning:'Em trai',       example:'弟弟喜欢玩。',    example_meaning:'Em trai thích chơi.',     tone:4 },
  { id:406, hsk:1, lesson_id:4, hanzi:'妹妹', pinyin:'mèi mei',  meaning:'Em gái',        example:'妹妹很可爱。',    example_meaning:'Em gái rất đáng yêu.',   tone:4 },
  { id:407, hsk:1, lesson_id:4, hanzi:'家',   pinyin:'jiā',      meaning:'Nhà / Gia đình',example:'我家有五口人。',  example_meaning:'Nhà tôi có năm người.',   tone:1 },
  { id:408, hsk:1, lesson_id:4, hanzi:'人',   pinyin:'rén',      meaning:'Người',         example:'他是好人。',      example_meaning:'Anh ấy là người tốt.',   tone:2 },
  { id:409, hsk:1, lesson_id:4, hanzi:'爷爷', pinyin:'yé ye',    meaning:'Ông nội',       example:'爷爷七十岁了。',  example_meaning:'Ông nội đã 70 tuổi.',    tone:2 },
  { id:410, hsk:1, lesson_id:4, hanzi:'奶奶', pinyin:'nǎi nai',  meaning:'Bà nội',        example:'奶奶做饭很好吃。',example_meaning:'Bà nội nấu ăn ngon.',     tone:3 },
  { id:411, hsk:1, lesson_id:4, hanzi:'儿子', pinyin:'ér zi',    meaning:'Con trai',      example:'他有一个儿子。',  example_meaning:'Anh ấy có một con trai.', tone:2 },
  { id:412, hsk:1, lesson_id:4, hanzi:'女儿', pinyin:'nǚ ér',    meaning:'Con gái',       example:'女儿很聪明。',    example_meaning:'Con gái rất thông minh.',tone:3 },
  { id:413, hsk:1, lesson_id:4, hanzi:'丈夫', pinyin:'zhàng fu', meaning:'Chồng',         example:'我丈夫是越南人。',example_meaning:'Chồng tôi là người Việt.', tone:4 },
  { id:414, hsk:1, lesson_id:4, hanzi:'妻子', pinyin:'qī zi',    meaning:'Vợ',            example:'妻子在家。',      example_meaning:'Vợ ở nhà.',              tone:1 },

  // ── HSK 1 · Bài 5: Thức Ăn & Đồ Uống ──
  { id:501, hsk:1, lesson_id:5, hanzi:'饭',  pinyin:'fàn',      meaning:'Cơm',           example:'我想吃饭。',     example_meaning:'Tôi muốn ăn cơm.',       tone:4 },
  { id:502, hsk:1, lesson_id:5, hanzi:'水',  pinyin:'shuǐ',     meaning:'Nước',          example:'我要一杯水。',   example_meaning:'Tôi muốn một ly nước.',  tone:3 },
  { id:503, hsk:1, lesson_id:5, hanzi:'茶',  pinyin:'chá',      meaning:'Trà',           example:'中国茶很好喝。', example_meaning:'Trà Trung Quốc rất ngon.',tone:2 },
  { id:504, hsk:1, lesson_id:5, hanzi:'咖啡',pinyin:'kā fēi',   meaning:'Cà phê',        example:'我喝咖啡。',     example_meaning:'Tôi uống cà phê.',       tone:1 },
  { id:505, hsk:1, lesson_id:5, hanzi:'面包',pinyin:'miàn bāo', meaning:'Bánh mì',       example:'我吃面包。',     example_meaning:'Tôi ăn bánh mì.',        tone:4 },
  { id:506, hsk:1, lesson_id:5, hanzi:'米饭',pinyin:'mǐ fàn',   meaning:'Cơm trắng',     example:'米饭很好吃。',   example_meaning:'Cơm trắng rất ngon.',    tone:3 },
  { id:507, hsk:1, lesson_id:5, hanzi:'面条',pinyin:'miàn tiáo',meaning:'Mì/Bún',        example:'我爱吃面条。',   example_meaning:'Tôi thích ăn mì.',       tone:4 },
  { id:508, hsk:1, lesson_id:5, hanzi:'肉',  pinyin:'ròu',      meaning:'Thịt',          example:'我不吃肉。',     example_meaning:'Tôi không ăn thịt.',     tone:4 },
  { id:509, hsk:1, lesson_id:5, hanzi:'鱼',  pinyin:'yú',       meaning:'Cá',            example:'今天吃鱼。',     example_meaning:'Hôm nay ăn cá.',         tone:2 },
  { id:510, hsk:1, lesson_id:5, hanzi:'蔬菜',pinyin:'shū cài',  meaning:'Rau củ',        example:'多吃蔬菜。',     example_meaning:'Ăn nhiều rau củ.',       tone:1 },
  { id:511, hsk:1, lesson_id:5, hanzi:'水果',pinyin:'shuǐ guǒ', meaning:'Trái cây',      example:'水果对身体好。', example_meaning:'Trái cây tốt cho sức khỏe.',tone:3 },
  { id:512, hsk:1, lesson_id:5, hanzi:'苹果',pinyin:'píng guǒ', meaning:'Táo',           example:'一个苹果。',     example_meaning:'Một quả táo.',            tone:2 },
  { id:513, hsk:1, lesson_id:5, hanzi:'吃',  pinyin:'chī',      meaning:'Ăn',            example:'你吃了吗？',     example_meaning:'Bạn ăn chưa?',           tone:1 },
  { id:514, hsk:1, lesson_id:5, hanzi:'喝',  pinyin:'hē',       meaning:'Uống',          example:'喝水很重要。',   example_meaning:'Uống nước rất quan trọng.',tone:1 },
  { id:515, hsk:1, lesson_id:5, hanzi:'好吃',pinyin:'hǎo chī',  meaning:'Ngon',          example:'这个很好吃！',   example_meaning:'Cái này rất ngon!',       tone:3 },
  { id:516, hsk:1, lesson_id:5, hanzi:'饿',  pinyin:'è',        meaning:'Đói',           example:'我很饿。',       example_meaning:'Tôi rất đói.',            tone:4 },

  // ── HSK 1 · Bài 6: Thời Gian ──
  { id:601, hsk:1, lesson_id:6, hanzi:'今天', pinyin:'jīn tiān',  meaning:'Hôm nay',       example:'今天天气很好。',  example_meaning:'Hôm nay thời tiết đẹp.',  tone:1 },
  { id:602, hsk:1, lesson_id:6, hanzi:'明天', pinyin:'míng tiān', meaning:'Ngày mai',      example:'明天见！',        example_meaning:'Hẹn ngày mai!',           tone:2 },
  { id:603, hsk:1, lesson_id:6, hanzi:'昨天', pinyin:'zuó tiān',  meaning:'Hôm qua',       example:'昨天我去了学校。',example_meaning:'Hôm qua tôi đi học.',     tone:2 },
  { id:604, hsk:1, lesson_id:6, hanzi:'几点', pinyin:'jǐ diǎn',   meaning:'Mấy giờ',       example:'现在几点了？',    example_meaning:'Bây giờ mấy giờ rồi?',   tone:3 },
  { id:605, hsk:1, lesson_id:6, hanzi:'现在', pinyin:'xiàn zài',  meaning:'Bây giờ',       example:'现在是三点。',    example_meaning:'Bây giờ là ba giờ.',      tone:4 },
  { id:606, hsk:1, lesson_id:6, hanzi:'上午', pinyin:'shàng wǔ',  meaning:'Buổi sáng',     example:'上午我有课。',    example_meaning:'Buổi sáng tôi có lớp.',  tone:4 },
  { id:607, hsk:1, lesson_id:6, hanzi:'下午', pinyin:'xià wǔ',    meaning:'Buổi chiều',    example:'下午去公园。',    example_meaning:'Buổi chiều đi công viên.',tone:4 },
  { id:608, hsk:1, lesson_id:6, hanzi:'晚上', pinyin:'wǎn shàng', meaning:'Buổi tối',      example:'晚上好！',        example_meaning:'Chào buổi tối!',          tone:3 },
  { id:609, hsk:1, lesson_id:6, hanzi:'年',   pinyin:'nián',      meaning:'Năm',           example:'今年是2026年。',  example_meaning:'Năm nay là 2026.',        tone:2 },
  { id:610, hsk:1, lesson_id:6, hanzi:'月',   pinyin:'yuè',       meaning:'Tháng',         example:'这个月很忙。',    example_meaning:'Tháng này rất bận.',      tone:4 },
  { id:611, hsk:1, lesson_id:6, hanzi:'星期', pinyin:'xīng qī',   meaning:'Tuần / Thứ',    example:'星期一上班。',    example_meaning:'Thứ Hai đi làm.',         tone:1 },
  { id:612, hsk:1, lesson_id:6, hanzi:'分钟', pinyin:'fēn zhōng', meaning:'Phút',          example:'等一分钟。',      example_meaning:'Đợi một phút.',           tone:1 },

  // ── HSK 2 · Bài 7: Mua Sắm ──
  { id:701, hsk:2, lesson_id:7, hanzi:'多少钱',pinyin:'duō shǎo qián',meaning:'Bao nhiêu tiền',   example:'这个多少钱？',   example_meaning:'Cái này bao nhiêu tiền?', tone:1 },
  { id:702, hsk:2, lesson_id:7, hanzi:'便宜',  pinyin:'pián yi',      meaning:'Rẻ',               example:'这个很便宜。',   example_meaning:'Cái này rất rẻ.',         tone:2 },
  { id:703, hsk:2, lesson_id:7, hanzi:'贵',    pinyin:'guì',          meaning:'Đắt',              example:'太贵了！',       example_meaning:'Đắt quá!',               tone:4 },
  { id:704, hsk:2, lesson_id:7, hanzi:'买',    pinyin:'mǎi',          meaning:'Mua',              example:'我想买这个。',   example_meaning:'Tôi muốn mua cái này.',  tone:3 },
  { id:705, hsk:2, lesson_id:7, hanzi:'卖',    pinyin:'mài',          meaning:'Bán',              example:'他卖水果。',     example_meaning:'Anh ấy bán trái cây.',   tone:4 },
  { id:706, hsk:2, lesson_id:7, hanzi:'钱',    pinyin:'qián',         meaning:'Tiền',             example:'我没有钱。',     example_meaning:'Tôi không có tiền.',     tone:2 },
  { id:707, hsk:2, lesson_id:7, hanzi:'商店',  pinyin:'shāng diàn',   meaning:'Cửa hàng',         example:'我去商店。',     example_meaning:'Tôi đi cửa hàng.',      tone:1 },
  { id:708, hsk:2, lesson_id:7, hanzi:'超市',  pinyin:'chāo shì',     meaning:'Siêu thị',         example:'超市很大。',     example_meaning:'Siêu thị rất lớn.',      tone:1 },
  { id:709, hsk:2, lesson_id:7, hanzi:'打折',  pinyin:'dǎ zhé',       meaning:'Giảm giá',         example:'打八折。',       example_meaning:'Giảm 20%.',              tone:3 },
  { id:710, hsk:2, lesson_id:7, hanzi:'找钱',  pinyin:'zhǎo qián',    meaning:'Thối tiền',        example:'找你五元。',     example_meaning:'Thối lại 5 tệ.',         tone:3 },
  { id:711, hsk:2, lesson_id:7, hanzi:'收据',  pinyin:'shōu jù',      meaning:'Biên lai',         example:'给我收据。',     example_meaning:'Cho tôi biên lai.',      tone:1 },
  { id:712, hsk:2, lesson_id:7, hanzi:'换',    pinyin:'huàn',         meaning:'Đổi',              example:'我想换一件。',   example_meaning:'Tôi muốn đổi một cái.', tone:4 },
  { id:713, hsk:2, lesson_id:7, hanzi:'免费',  pinyin:'miǎn fèi',     meaning:'Miễn phí',         example:'今天免费！',     example_meaning:'Hôm nay miễn phí!',     tone:3 },
  { id:714, hsk:2, lesson_id:7, hanzi:'付钱',  pinyin:'fù qián',      meaning:'Trả tiền',         example:'我用手机付钱。', example_meaning:'Tôi trả tiền bằng điện thoại.',tone:4 },
  { id:715, hsk:2, lesson_id:7, hanzi:'价格',  pinyin:'jià gé',       meaning:'Giá cả',           example:'价格合理。',     example_meaning:'Giá cả hợp lý.',         tone:4 },
  { id:716, hsk:2, lesson_id:7, hanzi:'质量',  pinyin:'zhì liàng',    meaning:'Chất lượng',       example:'质量很好。',     example_meaning:'Chất lượng rất tốt.',    tone:4 },
  { id:717, hsk:2, lesson_id:7, hanzi:'颜色',  pinyin:'yán sè',       meaning:'Màu sắc',          example:'有别的颜色吗？', example_meaning:'Có màu khác không?',     tone:2 },
  { id:718, hsk:2, lesson_id:7, hanzi:'尺寸',  pinyin:'chǐ cùn',      meaning:'Kích cỡ',          example:'什么尺寸？',     example_meaning:'Cỡ nào?',               tone:3 },

  // ── HSK 2 · Bài 8: Giao Thông ──
  { id:801, hsk:2, lesson_id:8, hanzi:'公交车',pinyin:'gōng jiāo chē',meaning:'Xe buýt',          example:'坐公交车去。',   example_meaning:'Đi xe buýt.',            tone:1 },
  { id:802, hsk:2, lesson_id:8, hanzi:'地铁',  pinyin:'dì tiě',       meaning:'Tàu điện ngầm',    example:'坐地铁很快。',   example_meaning:'Đi tàu điện ngầm nhanh.',tone:4 },
  { id:803, hsk:2, lesson_id:8, hanzi:'出租车',pinyin:'chū zū chē',   meaning:'Taxi',             example:'打出租车吧。',   example_meaning:'Đi taxi đi.',            tone:1 },
  { id:804, hsk:2, lesson_id:8, hanzi:'骑车',  pinyin:'qí chē',       meaning:'Đạp xe',           example:'我骑车上班。',   example_meaning:'Tôi đạp xe đi làm.',    tone:2 },
  { id:805, hsk:2, lesson_id:8, hanzi:'走路',  pinyin:'zǒu lù',       meaning:'Đi bộ',            example:'走路去学校。',   example_meaning:'Đi bộ đến trường.',      tone:3 },
  { id:806, hsk:2, lesson_id:8, hanzi:'开车',  pinyin:'kāi chē',      meaning:'Lái xe',           example:'他会开车。',     example_meaning:'Anh ấy biết lái xe.',   tone:1 },
  { id:807, hsk:2, lesson_id:8, hanzi:'火车',  pinyin:'huǒ chē',      meaning:'Tàu hỏa',          example:'坐火车去北京。', example_meaning:'Đi tàu hỏa đến Bắc Kinh.',tone:3 },
  { id:808, hsk:2, lesson_id:8, hanzi:'飞机',  pinyin:'fēi jī',       meaning:'Máy bay',          example:'坐飞机很贵。',   example_meaning:'Đi máy bay rất đắt.',   tone:1 },
  { id:809, hsk:2, lesson_id:8, hanzi:'站',    pinyin:'zhàn',         meaning:'Trạm / Dừng',      example:'下一站是哪里？', example_meaning:'Trạm tiếp theo là đâu?', tone:4 },
  { id:810, hsk:2, lesson_id:8, hanzi:'路',    pinyin:'lù',           meaning:'Đường',            example:'这条路很长。',   example_meaning:'Con đường này rất dài.', tone:4 },
  { id:811, hsk:2, lesson_id:8, hanzi:'堵车',  pinyin:'dǔ chē',       meaning:'Kẹt xe',           example:'今天堵车了。',   example_meaning:'Hôm nay kẹt xe.',        tone:3 },
  { id:812, hsk:2, lesson_id:8, hanzi:'红绿灯',pinyin:'hóng lǜ dēng', meaning:'Đèn giao thông',   example:'等红绿灯。',     example_meaning:'Đợi đèn giao thông.',    tone:2 },
  { id:813, hsk:2, lesson_id:8, hanzi:'左',    pinyin:'zuǒ',          meaning:'Trái',             example:'向左转。',       example_meaning:'Rẽ trái.',               tone:3 },
  { id:814, hsk:2, lesson_id:8, hanzi:'右',    pinyin:'yòu',          meaning:'Phải',             example:'向右转。',       example_meaning:'Rẽ phải.',               tone:4 },
  { id:815, hsk:2, lesson_id:8, hanzi:'直走',  pinyin:'zhí zǒu',      meaning:'Đi thẳng',         example:'直走两百米。',   example_meaning:'Đi thẳng 200 mét.',      tone:2 },

  // ── HSK 2 · Bài 9: Sức Khỏe ──
  { id:901, hsk:2, lesson_id:9, hanzi:'医院',  pinyin:'yī yuàn',  meaning:'Bệnh viện',        example:'去医院看病。',   example_meaning:'Đi bệnh viện khám bệnh.', tone:1 },
  { id:902, hsk:2, lesson_id:9, hanzi:'医生',  pinyin:'yī shēng', meaning:'Bác sĩ',           example:'医生说要休息。', example_meaning:'Bác sĩ nói cần nghỉ ngơi.',tone:1 },
  { id:903, hsk:2, lesson_id:9, hanzi:'头疼',  pinyin:'tóu téng', meaning:'Đau đầu',          example:'我头疼。',       example_meaning:'Tôi bị đau đầu.',         tone:2 },
  { id:904, hsk:2, lesson_id:9, hanzi:'发烧',  pinyin:'fā shāo',  meaning:'Sốt',              example:'我发烧了。',     example_meaning:'Tôi bị sốt.',             tone:1 },
  { id:905, hsk:2, lesson_id:9, hanzi:'咳嗽',  pinyin:'ké sou',   meaning:'Ho',               example:'他一直咳嗽。',   example_meaning:'Anh ấy ho mãi.',          tone:2 },
  { id:906, hsk:2, lesson_id:9, hanzi:'药',    pinyin:'yào',      meaning:'Thuốc',            example:'吃药了吗？',     example_meaning:'Uống thuốc chưa?',        tone:4 },
  { id:907, hsk:2, lesson_id:9, hanzi:'休息',  pinyin:'xiū xi',   meaning:'Nghỉ ngơi',        example:'多休息。',       example_meaning:'Nghỉ ngơi nhiều vào.',    tone:1 },
  { id:908, hsk:2, lesson_id:9, hanzi:'身体',  pinyin:'shēn tǐ',  meaning:'Cơ thể / Sức khỏe',example:'身体健康。',     example_meaning:'Cơ thể khỏe mạnh.',      tone:1 },
  { id:909, hsk:2, lesson_id:9, hanzi:'肚子疼',pinyin:'dù zi téng',meaning:'Đau bụng',        example:'我肚子疼。',     example_meaning:'Tôi đau bụng.',           tone:4 },
  { id:910, hsk:2, lesson_id:9, hanzi:'过敏',  pinyin:'guò mǐn',  meaning:'Dị ứng',           example:'我对花粉过敏。', example_meaning:'Tôi dị ứng với phấn hoa.',tone:4 },
  { id:911, hsk:2, lesson_id:9, hanzi:'手术',  pinyin:'shǒu shù', meaning:'Phẫu thuật',       example:'需要做手术。',   example_meaning:'Cần phải phẫu thuật.',   tone:3 },
  { id:912, hsk:2, lesson_id:9, hanzi:'护士',  pinyin:'hù shi',   meaning:'Y tá',             example:'护士很友善。',   example_meaning:'Y tá rất thân thiện.',   tone:4 },
  { id:913, hsk:2, lesson_id:9, hanzi:'检查',  pinyin:'jiǎn chá', meaning:'Kiểm tra / Khám',  example:'去检查身体。',   example_meaning:'Đi kiểm tra sức khỏe.',  tone:3 },
  { id:914, hsk:2, lesson_id:9, hanzi:'健康',  pinyin:'jiàn kāng',meaning:'Khỏe mạnh',        example:'祝你健康！',     example_meaning:'Chúc bạn mạnh khỏe!',    tone:4 },
  { id:915, hsk:2, lesson_id:9, hanzi:'生病',  pinyin:'shēng bìng',meaning:'Bị bệnh',         example:'他生病了。',     example_meaning:'Anh ấy bị bệnh.',        tone:1 },
  { id:916, hsk:2, lesson_id:9, hanzi:'打针',  pinyin:'dǎ zhēn',  meaning:'Tiêm thuốc',       example:'我怕打针。',     example_meaning:'Tôi sợ tiêm thuốc.',     tone:3 },
  { id:917, hsk:2, lesson_id:9, hanzi:'血压',  pinyin:'xuè yā',   meaning:'Huyết áp',         example:'血压正常。',     example_meaning:'Huyết áp bình thường.',  tone:4 },
  { id:918, hsk:2, lesson_id:9, hanzi:'体温',  pinyin:'tǐ wēn',   meaning:'Nhiệt độ cơ thể',  example:'量体温。',       example_meaning:'Đo nhiệt độ.',            tone:3 },
  { id:919, hsk:2, lesson_id:9, hanzi:'感冒',  pinyin:'gǎn mào',  meaning:'Cảm cúm',          example:'我感冒了。',     example_meaning:'Tôi bị cảm.',             tone:3 },
  { id:920, hsk:2, lesson_id:9, hanzi:'手',    pinyin:'shǒu',     meaning:'Tay',              example:'洗手。',         example_meaning:'Rửa tay.',               tone:3 },

  // ── HSK 3 · Bài 10: Thời Tiết ──
  { id:1001, hsk:3, lesson_id:10, hanzi:'天气',  pinyin:'tiān qì',    meaning:'Thời tiết',     example:'今天天气怎么样？',example_meaning:'Hôm nay thời tiết thế nào?', tone:1 },
  { id:1002, hsk:3, lesson_id:10, hanzi:'下雨',  pinyin:'xià yǔ',     meaning:'Mưa',           example:'今天下雨了。',   example_meaning:'Hôm nay trời mưa.',      tone:4 },
  { id:1003, hsk:3, lesson_id:10, hanzi:'晴天',  pinyin:'qíng tiān',  meaning:'Trời nắng',     example:'今天是晴天。',   example_meaning:'Hôm nay trời nắng.',     tone:2 },
  { id:1004, hsk:3, lesson_id:10, hanzi:'刮风',  pinyin:'guā fēng',   meaning:'Gió thổi',      example:'今天刮大风。',   example_meaning:'Hôm nay gió to.',        tone:1 },
  { id:1005, hsk:3, lesson_id:10, hanzi:'温度',  pinyin:'wēn dù',     meaning:'Nhiệt độ',      example:'温度很高。',     example_meaning:'Nhiệt độ rất cao.',      tone:1 },
  { id:1006, hsk:3, lesson_id:10, hanzi:'下雪',  pinyin:'xià xuě',    meaning:'Tuyết rơi',     example:'冬天下雪。',     example_meaning:'Mùa đông có tuyết rơi.', tone:4 },
  { id:1007, hsk:3, lesson_id:10, hanzi:'云',    pinyin:'yún',        meaning:'Mây',           example:'天上有云。',     example_meaning:'Trên trời có mây.',      tone:2 },
  { id:1008, hsk:3, lesson_id:10, hanzi:'季节',  pinyin:'jì jié',     meaning:'Mùa / Mùa vụ', example:'你喜欢哪个季节？',example_meaning:'Bạn thích mùa nào?',     tone:4 },
  { id:1009, hsk:3, lesson_id:10, hanzi:'春天',  pinyin:'chūn tiān',  meaning:'Mùa xuân',      example:'春天很美。',     example_meaning:'Mùa xuân rất đẹp.',     tone:1 },
  { id:1010, hsk:3, lesson_id:10, hanzi:'夏天',  pinyin:'xià tiān',   meaning:'Mùa hè',        example:'夏天很热。',     example_meaning:'Mùa hè rất nóng.',      tone:4 },
  { id:1011, hsk:3, lesson_id:10, hanzi:'秋天',  pinyin:'qiū tiān',   meaning:'Mùa thu',       example:'秋天凉快。',     example_meaning:'Mùa thu mát mẻ.',        tone:1 },
  { id:1012, hsk:3, lesson_id:10, hanzi:'冬天',  pinyin:'dōng tiān',  meaning:'Mùa đông',      example:'冬天很冷。',     example_meaning:'Mùa đông rất lạnh.',    tone:1 },
  { id:1013, hsk:3, lesson_id:10, hanzi:'热',    pinyin:'rè',         meaning:'Nóng',          example:'今天很热！',     example_meaning:'Hôm nay rất nóng!',     tone:4 },
  { id:1014, hsk:3, lesson_id:10, hanzi:'冷',    pinyin:'lěng',       meaning:'Lạnh',          example:'天气太冷了。',   example_meaning:'Thời tiết lạnh quá.',   tone:3 },
  { id:1015, hsk:3, lesson_id:10, hanzi:'凉快',  pinyin:'liáng kuai', meaning:'Mát mẻ',        example:'今天很凉快。',   example_meaning:'Hôm nay mát mẻ.',       tone:2 },
  { id:1016, hsk:3, lesson_id:10, hanzi:'雷',    pinyin:'léi',        meaning:'Sấm',           example:'打雷了。',       example_meaning:'Có sấm rồi.',            tone:2 },
  { id:1017, hsk:3, lesson_id:10, hanzi:'闪电',  pinyin:'shǎn diàn',  meaning:'Sét / Chớp',   example:'有闪电。',       example_meaning:'Có sét.',                tone:3 },
  { id:1018, hsk:3, lesson_id:10, hanzi:'湿度',  pinyin:'shī dù',     meaning:'Độ ẩm',         example:'湿度很高。',     example_meaning:'Độ ẩm rất cao.',         tone:1 },
  { id:1019, hsk:3, lesson_id:10, hanzi:'天气预报',pinyin:'tiān qì yù bào',meaning:'Dự báo thời tiết',example:'看天气预报。',example_meaning:'Xem dự báo thời tiết.', tone:1 },
  { id:1020, hsk:3, lesson_id:10, hanzi:'气候',  pinyin:'qì hòu',     meaning:'Khí hậu',       example:'越南气候很热。', example_meaning:'Khí hậu Việt Nam rất nóng.',tone:4 },
  { id:1021, hsk:3, lesson_id:10, hanzi:'雨伞',  pinyin:'yǔ sǎn',     meaning:'Ô / Dù',        example:'带雨伞。',       example_meaning:'Mang theo ô.',           tone:3 },
  { id:1022, hsk:3, lesson_id:10, hanzi:'暖和',  pinyin:'nuǎn huo',   meaning:'Ấm áp',         example:'春天暖和。',     example_meaning:'Mùa xuân ấm áp.',       tone:3 },

  // ── HSK 3 · Bài 11: Du Lịch ──
  { id:1101, hsk:3, lesson_id:11, hanzi:'旅游',  pinyin:'lǚ yóu',    meaning:'Du lịch',        example:'我喜欢旅游。',    example_meaning:'Tôi thích du lịch.',      tone:3 },
  { id:1102, hsk:3, lesson_id:11, hanzi:'护照',  pinyin:'hù zhào',   meaning:'Hộ chiếu',       example:'护照在哪里？',    example_meaning:'Hộ chiếu ở đâu?',        tone:4 },
  { id:1103, hsk:3, lesson_id:11, hanzi:'酒店',  pinyin:'jiǔ diàn',  meaning:'Khách sạn',      example:'住酒店。',        example_meaning:'Ở khách sạn.',           tone:3 },
  { id:1104, hsk:3, lesson_id:11, hanzi:'飞机',  pinyin:'fēi jī',    meaning:'Máy bay',        example:'坐飞机去北京。',  example_meaning:'Đi máy bay đến Bắc Kinh.',tone:1 },
  { id:1105, hsk:3, lesson_id:11, hanzi:'签证',  pinyin:'qiān zhèng',meaning:'Visa',           example:'申请签证。',      example_meaning:'Xin visa.',               tone:1 },
  { id:1106, hsk:3, lesson_id:11, hanzi:'景点',  pinyin:'jǐng diǎn', meaning:'Điểm tham quan', example:'这里有很多景点。', example_meaning:'Nơi này có nhiều điểm tham quan.',tone:3 },
  { id:1107, hsk:3, lesson_id:11, hanzi:'导游',  pinyin:'dǎo yóu',   meaning:'Hướng dẫn viên', example:'导游很专业。',    example_meaning:'Hướng dẫn viên rất chuyên nghiệp.',tone:3 },
  { id:1108, hsk:3, lesson_id:11, hanzi:'行李',  pinyin:'xíng lǐ',   meaning:'Hành lý',        example:'行李太重了。',    example_meaning:'Hành lý nặng quá.',       tone:2 },
  { id:1109, hsk:3, lesson_id:11, hanzi:'机票',  pinyin:'jī piào',   meaning:'Vé máy bay',     example:'买机票了吗？',    example_meaning:'Mua vé máy bay chưa?',   tone:1 },
  { id:1110, hsk:3, lesson_id:11, hanzi:'订房',  pinyin:'dìng fáng', meaning:'Đặt phòng',      example:'提前订房。',      example_meaning:'Đặt phòng trước.',        tone:4 },
  { id:1111, hsk:3, lesson_id:11, hanzi:'地图',  pinyin:'dì tú',     meaning:'Bản đồ',         example:'看地图。',        example_meaning:'Xem bản đồ.',             tone:4 },
  { id:1112, hsk:3, lesson_id:11, hanzi:'旅馆',  pinyin:'lǚ guǎn',   meaning:'Nhà nghỉ',       example:'住旅馆便宜。',    example_meaning:'Ở nhà nghỉ rẻ hơn.',     tone:3 },
  { id:1113, hsk:3, lesson_id:11, hanzi:'海关',  pinyin:'hǎi guān',  meaning:'Hải quan',       example:'过海关。',        example_meaning:'Qua hải quan.',           tone:3 },
  { id:1114, hsk:3, lesson_id:11, hanzi:'旅行',  pinyin:'lǚ xíng',   meaning:'Đi du lịch',     example:'旅行很愉快。',    example_meaning:'Chuyến đi rất vui.',      tone:3 },
  { id:1115, hsk:3, lesson_id:11, hanzi:'出发',  pinyin:'chū fā',    meaning:'Xuất phát',      example:'明天出发。',      example_meaning:'Ngày mai xuất phát.',     tone:1 },
  { id:1116, hsk:3, lesson_id:11, hanzi:'回来',  pinyin:'huí lái',   meaning:'Quay về',        example:'什么时候回来？',  example_meaning:'Khi nào quay về?',       tone:2 },
  { id:1117, hsk:3, lesson_id:11, hanzi:'外国',  pinyin:'wài guó',   meaning:'Nước ngoài',     example:'去外国旅游。',    example_meaning:'Du lịch nước ngoài.',    tone:4 },
  { id:1118, hsk:3, lesson_id:11, hanzi:'当地',  pinyin:'dāng dì',   meaning:'Địa phương',     example:'当地美食很好吃。',example_meaning:'Đặc sản địa phương ngon.', tone:1 },
  { id:1119, hsk:3, lesson_id:11, hanzi:'纪念品',pinyin:'jì niàn pǐn',meaning:'Quà lưu niệm',  example:'买纪念品。',      example_meaning:'Mua quà lưu niệm.',      tone:4 },
  { id:1120, hsk:3, lesson_id:11, hanzi:'风景',  pinyin:'fēng jǐng', meaning:'Phong cảnh',     example:'这里风景很美。',  example_meaning:'Phong cảnh nơi đây rất đẹp.',tone:1 },
  { id:1121, hsk:3, lesson_id:11, hanzi:'拍照',  pinyin:'pāi zhào',  meaning:'Chụp ảnh',       example:'可以拍照吗？',    example_meaning:'Có thể chụp ảnh không?', tone:1 },
  { id:1122, hsk:3, lesson_id:11, hanzi:'值得',  pinyin:'zhí dé',    meaning:'Đáng giá',       example:'很值得去。',      example_meaning:'Rất đáng để đi.',        tone:2 },
  { id:1123, hsk:3, lesson_id:11, hanzi:'入境',  pinyin:'rù jìng',   meaning:'Nhập cảnh',      example:'入境手续简单。',  example_meaning:'Thủ tục nhập cảnh đơn giản.',tone:4 },
  { id:1124, hsk:3, lesson_id:11, hanzi:'兑换',  pinyin:'duì huàn',  meaning:'Đổi tiền',       example:'在哪里兑换？',    example_meaning:'Đổi tiền ở đâu?',        tone:4 },
  { id:1125, hsk:3, lesson_id:11, hanzi:'旅途',  pinyin:'lǚ tú',     meaning:'Hành trình',     example:'旅途愉快！',      example_meaning:'Chúc chuyến đi vui vẻ!', tone:3 },

  // HSK 4 · Bài 12: Công Việc
  { id:1201, hsk:4, lesson_id:12, hanzi:'工作', pinyin:'gōng zuò', meaning:'Công việc', example:'我正在找工作。', example_meaning:'Tôi đang tìm việc.', tone:1 },
  { id:1202, hsk:4, lesson_id:12, hanzi:'公司', pinyin:'gōng sī', meaning:'Công ty', example:'这家公司很大。', example_meaning:'Công ty này rất lớn.', tone:1 },
  { id:1203, hsk:4, lesson_id:12, hanzi:'上班', pinyin:'shàng bān', meaning:'Đi làm', example:'我八点上班。', example_meaning:'Tôi đi làm lúc 8 giờ.', tone:4 },
  { id:1204, hsk:4, lesson_id:12, hanzi:'老板', pinyin:'lǎo bǎn', meaning:'Ông chủ', example:'老板今天开会。', example_meaning:'Sếp hôm nay họp.', tone:3 },
  { id:1205, hsk:4, lesson_id:12, hanzi:'工资', pinyin:'gōng zī', meaning:'Lương', example:'工资提高了。', example_meaning:'Lương đã tăng.', tone:1 },
  { id:1206, hsk:4, lesson_id:12, hanzi:'同事', pinyin:'tóng shì', meaning:'Đồng nghiệp', example:'同事很友好。', example_meaning:'Đồng nghiệp rất thân thiện.', tone:2 },
  { id:1207, hsk:4, lesson_id:12, hanzi:'会议', pinyin:'huì yì', meaning:'Cuộc họp', example:'会议几点开始？', example_meaning:'Cuộc họp bắt đầu lúc mấy giờ?', tone:4 },
  { id:1208, hsk:4, lesson_id:12, hanzi:'负责', pinyin:'fù zé', meaning:'Phụ trách', example:'他负责销售。', example_meaning:'Anh ấy phụ trách bán hàng.', tone:4 },
  { id:1209, hsk:4, lesson_id:12, hanzi:'任务', pinyin:'rèn wu', meaning:'Nhiệm vụ', example:'任务完成了。', example_meaning:'Nhiệm vụ đã hoàn thành.', tone:4 },
  { id:1210, hsk:4, lesson_id:12, hanzi:'经验', pinyin:'jīng yàn', meaning:'Kinh nghiệm', example:'他很有经验。', example_meaning:'Anh ấy rất có kinh nghiệm.', tone:1 },

  // HSK 4 · Bài 13: Cảm Xúc & Tính Cách
  { id:1301, hsk:4, lesson_id:13, hanzi:'高兴', pinyin:'gāo xìng', meaning:'Vui vẻ', example:'见到你很高兴。', example_meaning:'Gặp bạn tôi rất vui.', tone:1 },
  { id:1302, hsk:4, lesson_id:13, hanzi:'生气', pinyin:'shēng qì', meaning:'Tức giận', example:'他为什么生气？', example_meaning:'Tại sao anh ấy tức giận?', tone:1 },
  { id:1303, hsk:4, lesson_id:13, hanzi:'难过', pinyin:'nán guò', meaning:'Buồn', example:'她今天很难过。', example_meaning:'Hôm nay cô ấy rất buồn.', tone:2 },
  { id:1304, hsk:4, lesson_id:13, hanzi:'紧张', pinyin:'jǐn zhāng', meaning:'Căng thẳng', example:'考试前很紧张。', example_meaning:'Trước kỳ thi rất căng thẳng.', tone:3 },
  { id:1305, hsk:4, lesson_id:13, hanzi:'骄傲', pinyin:'jiāo ào', meaning:'Tự hào / Kiêu ngạo', example:'我为你骄傲。', example_meaning:'Tôi tự hào về bạn.', tone:1 },
  { id:1306, hsk:4, lesson_id:13, hanzi:'性格', pinyin:'xìng gé', meaning:'Tính cách', example:'他的性格很好。', example_meaning:'Tính cách của anh ấy rất tốt.', tone:4 },
  { id:1307, hsk:4, lesson_id:13, hanzi:'热情', pinyin:'rè qíng', meaning:'Nhiệt tình', example:'她对人很热情。', example_meaning:'Cô ấy rất nhiệt tình với mọi người.', tone:4 },
  { id:1308, hsk:4, lesson_id:13, hanzi:'耐心', pinyin:'nài xīn', meaning:'Kiên nhẫn', example:'老师很有耐心。', example_meaning:'Giáo viên rất kiên nhẫn.', tone:4 },
  { id:1309, hsk:4, lesson_id:13, hanzi:'诚实', pinyin:'chéng shí', meaning:'Thành thật', example:'诚实很重要。', example_meaning:'Thành thật rất quan trọng.', tone:2 },
  { id:1310, hsk:4, lesson_id:13, hanzi:'幽默', pinyin:'yōu mò', meaning:'Hài hước', example:'他很幽默。', example_meaning:'Anh ấy rất hài hước.', tone:1 },

  // HSK 5 · Bài 14: Kinh Tế & Tài Chính
  { id:1401, hsk:5, lesson_id:14, hanzi:'经济', pinyin:'jīng jì', meaning:'Kinh tế', example:'经济发展很快。', example_meaning:'Kinh tế phát triển rất nhanh.', tone:1 },
  { id:1402, hsk:5, lesson_id:14, hanzi:'股票', pinyin:'gǔ piào', meaning:'Cổ phiếu', example:'他买了股票。', example_meaning:'Anh ấy đã mua cổ phiếu.', tone:3 },
  { id:1403, hsk:5, lesson_id:14, hanzi:'投资', pinyin:'tóu zī', meaning:'Đầu tư', example:'投资需要谨慎。', example_meaning:'Đầu tư cần thận trọng.', tone:2 },
  { id:1404, hsk:5, lesson_id:14, hanzi:'银行', pinyin:'yín háng', meaning:'Ngân hàng', example:'银行九点开门。', example_meaning:'Ngân hàng mở cửa lúc 9 giờ.', tone:2 },
  { id:1405, hsk:5, lesson_id:14, hanzi:'利率', pinyin:'lì lǜ', meaning:'Lãi suất', example:'利率下降了。', example_meaning:'Lãi suất đã giảm.', tone:4 },
  { id:1406, hsk:5, lesson_id:14, hanzi:'收入', pinyin:'shōu rù', meaning:'Thu nhập', example:'收入比较稳定。', example_meaning:'Thu nhập khá ổn định.', tone:1 },
  { id:1407, hsk:5, lesson_id:14, hanzi:'支出', pinyin:'zhī chū', meaning:'Chi tiêu', example:'控制每月支出。', example_meaning:'Kiểm soát chi tiêu hằng tháng.', tone:1 },
  { id:1408, hsk:5, lesson_id:14, hanzi:'预算', pinyin:'yù suàn', meaning:'Ngân sách', example:'预算不够。', example_meaning:'Ngân sách không đủ.', tone:4 },
  { id:1409, hsk:5, lesson_id:14, hanzi:'利润', pinyin:'lì rùn', meaning:'Lợi nhuận', example:'利润增加了。', example_meaning:'Lợi nhuận đã tăng.', tone:4 },
  { id:1410, hsk:5, lesson_id:14, hanzi:'市场', pinyin:'shì chǎng', meaning:'Thị trường', example:'市场竞争激烈。', example_meaning:'Cạnh tranh thị trường gay gắt.', tone:4 },

  // HSK 5 · Bài 15: Môi Trường
  { id:1501, hsk:5, lesson_id:15, hanzi:'环境', pinyin:'huán jìng', meaning:'Môi trường', example:'保护环境很重要。', example_meaning:'Bảo vệ môi trường rất quan trọng.', tone:2 },
  { id:1502, hsk:5, lesson_id:15, hanzi:'污染', pinyin:'wū rǎn', meaning:'Ô nhiễm', example:'空气污染严重。', example_meaning:'Ô nhiễm không khí nghiêm trọng.', tone:1 },
  { id:1503, hsk:5, lesson_id:15, hanzi:'能源', pinyin:'néng yuán', meaning:'Năng lượng', example:'节约能源。', example_meaning:'Tiết kiệm năng lượng.', tone:2 },
  { id:1504, hsk:5, lesson_id:15, hanzi:'保护', pinyin:'bǎo hù', meaning:'Bảo vệ', example:'保护森林。', example_meaning:'Bảo vệ rừng.', tone:3 },
  { id:1505, hsk:5, lesson_id:15, hanzi:'气候', pinyin:'qì hòu', meaning:'Khí hậu', example:'气候正在变化。', example_meaning:'Khí hậu đang thay đổi.', tone:4 },
  { id:1506, hsk:5, lesson_id:15, hanzi:'垃圾', pinyin:'lā jī', meaning:'Rác', example:'垃圾要分类。', example_meaning:'Rác cần được phân loại.', tone:1 },
  { id:1507, hsk:5, lesson_id:15, hanzi:'回收', pinyin:'huí shōu', meaning:'Tái chế', example:'塑料可以回收。', example_meaning:'Nhựa có thể tái chế.', tone:2 },
  { id:1508, hsk:5, lesson_id:15, hanzi:'减少', pinyin:'jiǎn shǎo', meaning:'Giảm bớt', example:'减少浪费。', example_meaning:'Giảm lãng phí.', tone:3 },
  { id:1509, hsk:5, lesson_id:15, hanzi:'森林', pinyin:'sēn lín', meaning:'Rừng', example:'森林面积减少。', example_meaning:'Diện tích rừng giảm.', tone:1 },
  { id:1510, hsk:5, lesson_id:15, hanzi:'地球', pinyin:'dì qiú', meaning:'Trái đất', example:'地球是我们的家。', example_meaning:'Trái đất là nhà của chúng ta.', tone:4 },

  // HSK 6 · Bài 16: Triết Học & Văn Hóa
  { id:1601, hsk:6, lesson_id:16, hanzi:'哲学', pinyin:'zhé xué', meaning:'Triết học', example:'他研究哲学。', example_meaning:'Anh ấy nghiên cứu triết học.', tone:2 },
  { id:1602, hsk:6, lesson_id:16, hanzi:'文化', pinyin:'wén huà', meaning:'Văn hóa', example:'了解中国文化。', example_meaning:'Tìm hiểu văn hóa Trung Quốc.', tone:2 },
  { id:1603, hsk:6, lesson_id:16, hanzi:'传统', pinyin:'chuán tǒng', meaning:'Truyền thống', example:'传统节日很有意思。', example_meaning:'Lễ hội truyền thống rất thú vị.', tone:2 },
  { id:1604, hsk:6, lesson_id:16, hanzi:'思想', pinyin:'sī xiǎng', meaning:'Tư tưởng', example:'他的思想很深刻。', example_meaning:'Tư tưởng của ông ấy rất sâu sắc.', tone:1 },
  { id:1605, hsk:6, lesson_id:16, hanzi:'精神', pinyin:'jīng shén', meaning:'Tinh thần', example:'保持积极精神。', example_meaning:'Giữ tinh thần tích cực.', tone:1 },
  { id:1606, hsk:6, lesson_id:16, hanzi:'价值观', pinyin:'jià zhí guān', meaning:'Giá trị quan', example:'价值观会影响选择。', example_meaning:'Giá trị quan ảnh hưởng đến lựa chọn.', tone:4 },
  { id:1607, hsk:6, lesson_id:16, hanzi:'文明', pinyin:'wén míng', meaning:'Văn minh', example:'文明交流很重要。', example_meaning:'Giao lưu văn minh rất quan trọng.', tone:2 },
  { id:1608, hsk:6, lesson_id:16, hanzi:'象征', pinyin:'xiàng zhēng', meaning:'Tượng trưng', example:'龙象征力量。', example_meaning:'Rồng tượng trưng cho sức mạnh.', tone:4 },
  { id:1609, hsk:6, lesson_id:16, hanzi:'遗产', pinyin:'yí chǎn', meaning:'Di sản', example:'保护文化遗产。', example_meaning:'Bảo vệ di sản văn hóa.', tone:2 },
  { id:1610, hsk:6, lesson_id:16, hanzi:'信仰', pinyin:'xìn yǎng', meaning:'Niềm tin', example:'尊重不同信仰。', example_meaning:'Tôn trọng các niềm tin khác nhau.', tone:4 },

  // HSK 6 · Bài 17: Chính Trị & Xã Hội
  { id:1701, hsk:6, lesson_id:17, hanzi:'政治', pinyin:'zhèng zhì', meaning:'Chính trị', example:'他关心政治。', example_meaning:'Anh ấy quan tâm chính trị.', tone:4 },
  { id:1702, hsk:6, lesson_id:17, hanzi:'社会', pinyin:'shè huì', meaning:'Xã hội', example:'社会发展很快。', example_meaning:'Xã hội phát triển rất nhanh.', tone:4 },
  { id:1703, hsk:6, lesson_id:17, hanzi:'制度', pinyin:'zhì dù', meaning:'Chế độ', example:'制度需要完善。', example_meaning:'Chế độ cần được hoàn thiện.', tone:4 },
  { id:1704, hsk:6, lesson_id:17, hanzi:'民主', pinyin:'mín zhǔ', meaning:'Dân chủ', example:'讨论民主问题。', example_meaning:'Thảo luận vấn đề dân chủ.', tone:2 },
  { id:1705, hsk:6, lesson_id:17, hanzi:'改革', pinyin:'gǎi gé', meaning:'Cải cách', example:'改革带来变化。', example_meaning:'Cải cách mang lại thay đổi.', tone:3 },
  { id:1706, hsk:6, lesson_id:17, hanzi:'政策', pinyin:'zhèng cè', meaning:'Chính sách', example:'政策已经公布。', example_meaning:'Chính sách đã được công bố.', tone:4 },
  { id:1707, hsk:6, lesson_id:17, hanzi:'法律', pinyin:'fǎ lǜ', meaning:'Pháp luật', example:'遵守法律。', example_meaning:'Tuân thủ pháp luật.', tone:3 },
  { id:1708, hsk:6, lesson_id:17, hanzi:'权利', pinyin:'quán lì', meaning:'Quyền lợi', example:'保护公民权利。', example_meaning:'Bảo vệ quyền lợi công dân.', tone:2 },
  { id:1709, hsk:6, lesson_id:17, hanzi:'责任', pinyin:'zé rèn', meaning:'Trách nhiệm', example:'每个人都有责任。', example_meaning:'Mỗi người đều có trách nhiệm.', tone:2 },
  { id:1710, hsk:6, lesson_id:17, hanzi:'公平', pinyin:'gōng píng', meaning:'Công bằng', example:'追求社会公平。', example_meaning:'Theo đuổi công bằng xã hội.', tone:1 },
];

const EXTRA_VOCAB_ROWS = {
  12: [
    ['职位','zhí wèi','Vị trí công việc',2], ['面试','miàn shì','Phỏng vấn',4],
    ['简历','jiǎn lì','Sơ yếu lý lịch',3], ['合同','hé tong','Hợp đồng',2],
    ['加班','jiā bān','Tăng ca',1], ['请假','qǐng jià','Xin nghỉ phép',3],
    ['项目','xiàng mù','Dự án',4], ['报告','bào gào','Báo cáo',4],
    ['计划','jì huà','Kế hoạch',4], ['能力','néng lì','Năng lực',2],
    ['效率','xiào lǜ','Hiệu suất',4], ['培训','péi xùn','Đào tạo',2],
    ['部门','bù mén','Bộ phận',4], ['经理','jīng lǐ','Quản lý',1],
    ['客户','kè hù','Khách hàng',4], ['合作','hé zuò','Hợp tác',2],
    ['沟通','gōu tōng','Giao tiếp',1], ['竞争','jìng zhēng','Cạnh tranh',4],
    ['成功','chéng gōng','Thành công',2], ['失败','shī bài','Thất bại',1],
  ],
  13: [
    ['开朗','kāi lǎng','Cởi mở',1], ['内向','nèi xiàng','Hướng nội',4],
    ['外向','wài xiàng','Hướng ngoại',4], ['善良','shàn liáng','Tốt bụng',4],
    ['自信','zì xìn','Tự tin',4], ['害羞','hài xiū','Xấu hổ',4],
    ['冷静','lěng jìng','Bình tĩnh',3], ['激动','jī dòng','Kích động',1],
    ['担心','dān xīn','Lo lắng',1], ['放心','fàng xīn','Yên tâm',4],
    ['失望','shī wàng','Thất vọng',1], ['满意','mǎn yì','Hài lòng',3],
    ['孤独','gū dú','Cô độc',1], ['压力','yā lì','Áp lực',1],
    ['勇敢','yǒng gǎn','Dũng cảm',3], ['懒惰','lǎn duò','Lười biếng',3],
    ['认真','rèn zhēn','Nghiêm túc',4], ['温柔','wēn róu','Dịu dàng',1],
  ],
  14: [
    ['资本','zī běn','Vốn',1], ['金融','jīn róng','Tài chính',1],
    ['贷款','dài kuǎn','Khoản vay',4], ['账户','zhàng hù','Tài khoản',4],
    ['现金','xiàn jīn','Tiền mặt',4], ['信用卡','xìn yòng kǎ','Thẻ tín dụng',4],
    ['保险','bǎo xiǎn','Bảo hiểm',3], ['债务','zhài wù','Nợ',4],
    ['贸易','mào yì','Thương mại',4], ['出口','chū kǒu','Xuất khẩu',1],
    ['进口','jìn kǒu','Nhập khẩu',4], ['消费','xiāo fèi','Tiêu dùng',1],
    ['生产','shēng chǎn','Sản xuất',1], ['需求','xū qiú','Nhu cầu',1],
    ['供应','gōng yìng','Cung ứng',1], ['价格','jià gé','Giá cả',4],
    ['成本','chéng běn','Chi phí',2], ['风险','fēng xiǎn','Rủi ro',1],
    ['收益','shōu yì','Lợi tức',1], ['增长','zēng zhǎng','Tăng trưởng',1],
    ['下降','xià jiàng','Giảm xuống',4], ['危机','wēi jī','Khủng hoảng',1],
    ['复苏','fù sū','Phục hồi',4], ['汇率','huì lǜ','Tỷ giá',4],
    ['货币','huò bì','Tiền tệ',4], ['通货膨胀','tōng huò péng zhàng','Lạm phát',1],
    ['储蓄','chǔ xù','Tiết kiệm',3], ['资产','zī chǎn','Tài sản',1],
    ['负债','fù zhài','Nợ phải trả',4], ['盈利','yíng lì','Sinh lời',2],
  ],
  15: [
    ['生态','shēng tài','Sinh thái',1], ['资源','zī yuán','Tài nguyên',1],
    ['排放','pái fàng','Phát thải',2], ['二氧化碳','èr yǎng huà tàn','Carbon dioxide',4],
    ['温室效应','wēn shì xiào yìng','Hiệu ứng nhà kính',1], ['可持续','kě chí xù','Bền vững',3],
    ['节能','jié néng','Tiết kiệm năng lượng',2], ['环保','huán bǎo','Bảo vệ môi trường',2],
    ['自然','zì rán','Tự nhiên',4], ['野生动物','yě shēng dòng wù','Động vật hoang dã',3],
    ['海洋','hǎi yáng','Đại dương',3], ['河流','hé liú','Sông ngòi',2],
    ['土地','tǔ dì','Đất đai',3], ['沙漠','shā mò','Sa mạc',1],
    ['干旱','gān hàn','Hạn hán',1], ['洪水','hóng shuǐ','Lũ lụt',2],
    ['灾害','zāi hài','Thiên tai',1], ['噪音','zào yīn','Tiếng ồn',4],
    ['废物','fèi wù','Chất thải',4], ['塑料','sù liào','Nhựa',4],
    ['电池','diàn chí','Pin',4], ['再利用','zài lì yòng','Tái sử dụng',4],
    ['绿色','lǜ sè','Xanh / thân thiện môi trường',4], ['低碳','dī tàn','Ít carbon',1],
    ['植树','zhí shù','Trồng cây',2], ['节约','jié yuē','Tiết kiệm',2],
    ['浪费','làng fèi','Lãng phí',4], ['清洁','qīng jié','Sạch sẽ',1],
  ],
  16: [
    ['伦理','lún lǐ','Luân lý',2], ['道德','dào dé','Đạo đức',4],
    ['意识','yì shí','Ý thức',4], ['存在','cún zài','Tồn tại',2],
    ['本质','běn zhì','Bản chất',3], ['逻辑','luó jí','Logic',2],
    ['理论','lǐ lùn','Lý luận',3], ['实践','shí jiàn','Thực tiễn',2],
    ['审美','shěn měi','Thẩm mỹ',3], ['艺术','yì shù','Nghệ thuật',4],
    ['诗歌','shī gē','Thơ ca',1], ['文学','wén xué','Văn học',2],
    ['历史','lì shǐ','Lịch sử',4], ['经典','jīng diǎn','Kinh điển',1],
    ['习俗','xí sú','Phong tục',2], ['礼仪','lǐ yí','Lễ nghi',3],
    ['身份','shēn fèn','Thân phận / danh tính',1], ['民族','mín zú','Dân tộc',2],
    ['传承','chuán chéng','Kế thừa',2], ['创新','chuàng xīn','Đổi mới',4],
    ['观念','guān niàn','Quan niệm',1], ['信念','xìn niàn','Niềm tin',4],
    ['灵魂','líng hún','Linh hồn',2], ['命运','mìng yùn','Số phận',4],
    ['自由','zì yóu','Tự do',4], ['平等','píng děng','Bình đẳng',2],
    ['尊严','zūn yán','Phẩm giá',1], ['智慧','zhì huì','Trí tuệ',4],
    ['理性','lǐ xìng','Lý tính',3], ['感性','gǎn xìng','Cảm tính',3],
    ['矛盾','máo dùn','Mâu thuẫn',2], ['和谐','hé xié','Hài hòa',2],
    ['宗教','zōng jiào','Tôn giáo',1], ['仪式','yí shì','Nghi thức',2],
    ['神话','shén huà','Thần thoại',2], ['符号','fú hào','Ký hiệu',2],
    ['翻译','fān yì','Phiên dịch / dịch thuật',1], ['交流','jiāo liú','Giao lưu',1],
    ['影响','yǐng xiǎng','Ảnh hưởng',3], ['启发','qǐ fā','Gợi mở',3],
    ['反思','fǎn sī','Suy ngẫm',3], ['追求','zhuī qiú','Theo đuổi',1],
    ['理想','lǐ xiǎng','Lý tưởng',3], ['现实','xiàn shí','Hiện thực',4],
    ['境界','jìng jiè','Cảnh giới',4],
  ],
  17: [
    ['政府','zhèng fǔ','Chính phủ',4], ['国家','guó jiā','Quốc gia',2],
    ['公民','gōng mín','Công dân',1], ['人民','rén mín','Nhân dân',2],
    ['选举','xuǎn jǔ','Bầu cử',3], ['投票','tóu piào','Bỏ phiếu',2],
    ['议会','yì huì','Quốc hội / nghị viện',4], ['代表','dài biǎo','Đại diện',4],
    ['领导','lǐng dǎo','Lãnh đạo',3], ['权力','quán lì','Quyền lực',2],
    ['义务','yì wù','Nghĩa vụ',4], ['利益','lì yì','Lợi ích',4],
    ['公共','gōng gòng','Công cộng',1], ['安全','ān quán','An toàn',1],
    ['秩序','zhì xù','Trật tự',4], ['稳定','wěn dìng','Ổn định',3],
    ['发展','fā zhǎn','Phát triển',1], ['冲突','chōng tū','Xung đột',1],
    ['和平','hé píng','Hòa bình',2], ['战争','zhàn zhēng','Chiến tranh',4],
    ['外交','wài jiāo','Ngoại giao',4], ['国际','guó jì','Quốc tế',2],
    ['组织','zǔ zhī','Tổ chức',3], ['机构','jī gòu','Cơ quan',1],
    ['媒体','méi tǐ','Truyền thông',2], ['舆论','yú lùn','Dư luận',2],
    ['调查','diào chá','Điều tra',4], ['统计','tǒng jì','Thống kê',3],
    ['人口','rén kǒu','Dân số',2], ['就业','jiù yè','Việc làm',4],
    ['教育','jiào yù','Giáo dục',4], ['医疗','yī liáo','Y tế',1],
    ['住房','zhù fáng','Nhà ở',4], ['贫困','pín kùn','Nghèo đói',2],
    ['平衡','píng héng','Cân bằng',2], ['透明','tòu míng','Minh bạch',4],
    ['腐败','fǔ bài','Tham nhũng',3], ['监督','jiān dū','Giám sát',1],
    ['执行','zhí xíng','Thực thi',2], ['批准','pī zhǔn','Phê chuẩn',1],
    ['签署','qiān shǔ','Ký kết',1], ['谈判','tán pàn','Đàm phán',2],
    ['协议','xié yì','Hiệp định',2], ['联盟','lián méng','Liên minh',2],
    ['边境','biān jìng','Biên giới',1], ['移民','yí mín','Di dân',2],
    ['社区','shè qū','Cộng đồng',4], ['志愿者','zhì yuàn zhě','Tình nguyện viên',4],
    ['福利','fú lì','Phúc lợi',2], ['保障','bǎo zhàng','Bảo đảm',3],
  ],
};

const LESSON_HSK = { 12:4, 13:4, 14:5, 15:5, 16:6, 17:6 };
Object.entries(EXTRA_VOCAB_ROWS).forEach(([lessonId, rows]) => {
  rows.forEach(([hanzi, pinyin, meaning, tone], i) => {
    DEMO_VOCAB.push({
      id: Number(lessonId) * 1000 + 100 + i,
      hsk: LESSON_HSK[lessonId],
      lesson_id: Number(lessonId),
      hanzi,
      pinyin,
      meaning,
      example: `${hanzi}很重要。`,
      example_meaning: `${meaning} rất quan trọng.`,
      tone,
    });
  });
});

let cards = [...DEMO_VOCAB];
let currentIdx = 0;
let isFlipped = false;
let correctCount = 0;
let ratedCards = new Set(); // theo dõi thẻ đã được đánh giá, tránh đếm trùng khi quay lại

function getDemoCardsForSelection(val) {
  if (val.startsWith('lesson_')) {
    const lid = parseInt(val.replace('lesson_', ''), 10);
    return DEMO_VOCAB.filter(v => v.lesson_id === lid);
  }
  const hsk = parseInt(val.replace('hsk_', ''), 10) || 1;
  return DEMO_VOCAB.filter(v => v.hsk === hsk);
}

function getSelectionLabel(val) {
  const sel = document.getElementById('hskFilter');
  const opt = sel.options[sel.selectedIndex];
  return opt ? opt.text.replace(/^──\s*/, '') : val;
}

function markCurrentLessonComplete() {
  const val = document.getElementById('hskFilter').value;
  if (!val.startsWith('lesson_')) return;

  const lid = parseInt(val.replace('lesson_', ''), 10);
  const p = JSON.parse(localStorage.getItem(getProgressKey()) || '{}');
  const ids = new Set((p.completedLessonIds || []).map(Number));
  const isNew = !ids.has(lid);
  ids.add(lid);
  p.completedLessonIds = [...ids];
  if (isNew) p.todayLessons = (p.todayLessons || 0) + 1;
  localStorage.setItem(getProgressKey(), JSON.stringify(p));
}

async function loadCards() {
  const val = document.getElementById('hskFilter').value;
  const demoCards = getDemoCardsForSelection(val);
  let loaded = false;

  try {
    const param = val.startsWith('lesson_') ? `lesson_id=${val.replace('lesson_','')}&count=999` : `hsk_level=${val.replace('hsk_','')}&count=999`;
    const res = await fetch(`${API_BASE}/vocabulary/flashcard?${param}`);
    if (!res.ok) throw new Error('Vocabulary API failed');
    const data = await res.json();
    if (data.flashcards?.length && (!demoCards.length || data.flashcards.length >= demoCards.length)) {
      cards = data.flashcards;
      loaded = true;
    }
  } catch { /* use demo */ }
  if (!loaded) cards = demoCards;
  currentIdx = 0;
  correctCount = 0;
  isFlipped = false;
  ratedCards = new Set();
  // Cập nhật tiêu đề số từ
  const total = cards.length;
  const mode = new URLSearchParams(location.search).get('mode');
  const label = getSelectionLabel(val);
  if (mode === 'list') {
    document.getElementById('pageHeading').textContent = '📋 Danh Sách Từ Vựng';
    document.getElementById('pageSubtext').textContent = 'Xem toàn bộ từ của bài trước khi học flashcard';
  } else {
    document.getElementById('pageHeading').textContent = '🃏 Học Flashcard';
    document.getElementById('pageSubtext').textContent = 'Nhấn vào thẻ để xem nghĩa · Đánh giá mức độ nhớ';
  }
  document.getElementById('cardSourceText').textContent = `${label} · ${total} từ`;
  document.getElementById('progressText').textContent = `0 / ${total}`;
  document.getElementById('progressBar').style.width = '0%';
  renderCard();
  renderVocabList();
}

function renderCard() {
  const card = cards[currentIdx];
  if (!card) {
    document.getElementById('cardHanzi').textContent = '—';
    document.getElementById('cardPinyin').textContent = '';
    document.getElementById('cardMeaning').textContent = 'Chưa có dữ liệu từ vựng';
    document.getElementById('cardExample').textContent = '';
    document.getElementById('tonebar').style.background = TONES[0];
    document.getElementById('cardCounter').textContent = 'Thẻ 0 / 0';
    document.getElementById('progressText').textContent = '0 / 0';
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('ratingArea').style.display = 'none';
    document.getElementById('flashcard').classList.remove('flipped');
    isFlipped = false;
    return;
  }
  document.getElementById('cardHanzi').textContent  = card.hanzi;
  document.getElementById('cardPinyin').textContent  = card.pinyin;
  document.getElementById('cardMeaning').textContent = card.meaning;
  document.getElementById('cardExample').innerHTML   = card.example
    ? `<strong style="font-family:'Noto Serif SC',serif;color:#e63946">${card.example}</strong><br><em>${card.example_meaning || ''}</em>`
    : '';
  document.getElementById('tonebar').style.background = TONES[card.tone] || TONES[0];
  document.getElementById('cardCounter').textContent = `Thẻ ${currentIdx + 1} / ${cards.length}`;
  document.getElementById('progressText').textContent = `${currentIdx} / ${cards.length}`;
  document.getElementById('progressBar').style.width = `${(currentIdx / cards.length) * 100}%`;

  // Reset flip
  if (isFlipped) {
    document.getElementById('flashcard').classList.remove('flipped');
    isFlipped = false;
  }
  document.getElementById('ratingArea').style.display = 'none';
}

function flipCard() {
  const fc = document.getElementById('flashcard');
  isFlipped = !isFlipped;
  fc.classList.toggle('flipped', isFlipped);
  if (isFlipped) document.getElementById('ratingArea').style.display = 'flex';
}

function nextCard() {
  if (!cards.length) return;
  if (currentIdx < cards.length - 1) { currentIdx++; renderCard(); }
  else showSummary();
}

function prevCard() {
  if (!cards.length) return;
  if (currentIdx > 0) { currentIdx--; renderCard(); }
}

function shuffleCards() {
  if (!cards.length) return;
  cards = [...cards].sort(() => Math.random() - 0.5);
  currentIdx = 0;
  correctCount = 0;
  ratedCards = new Set();
  renderCard();
}

function rateCard(quality) {
  if (quality >= 4 && !ratedCards.has(currentIdx)) {
    correctCount++;
    document.getElementById('sessionScore').textContent = `✅ ${correctCount} đúng`;
  }
  ratedCards.add(currentIdx);
  nextCard();
}

function speakCurrent(e) {
  e.stopPropagation();
  const hanzi = cards[currentIdx]?.hanzi;
  if (hanzi && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(hanzi);
    u.lang = 'zh-CN'; u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }
}

function showSummary() {
  if (!cards.length) return;
  const pct = Math.round((correctCount / cards.length) * 100);
  document.getElementById('summaryEmoji').textContent = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪';
  document.getElementById('summaryText').textContent = `Đúng ${correctCount}/${cards.length} từ (${pct}%)`;
  markCurrentLessonComplete();

  // Hiện nút "Tiếp theo" thông minh: lesson tiếp hoặc HSK tiếp
  const val = document.getElementById('hskFilter').value;
  const nextBtn = document.getElementById('summaryNextBtn');
  const sel = document.getElementById('hskFilter');
  const opts = Array.from(sel.options);
  const curIdx = opts.findIndex(o => o.value === val);
  // Tìm option tiếp theo không phải disabled/separator
  let nextOpt = null;
  for (let i = curIdx + 1; i < opts.length; i++) {
    if (!opts[i].disabled && opts[i].value !== '') { nextOpt = opts[i]; break; }
  }
  if (nextOpt) {
    nextBtn.textContent = nextOpt.text.replace('── ', '') + ' →';
    nextBtn.dataset.nextVal = nextOpt.value;
    nextBtn.style.display = 'inline-block';
  } else {
    nextBtn.style.display = 'none';
  }

  document.getElementById('summaryOverlay').style.display = 'flex';

  // Award XP
  const xp = correctCount * 10;
  const p = JSON.parse(localStorage.getItem(getProgressKey()) || '{}');
  p.xp = (p.xp || 0) + xp;
  localStorage.setItem(getProgressKey(), JSON.stringify(p));
}

function closeSummaryAndReload() {
  // Nếu đến từ lesson cụ thể (lesson_X) → redirect về lessons với param completed
  const val = document.getElementById('hskFilter').value;
  if (val.startsWith('lesson_')) {
    const lid = val.replace('lesson_', '');
    window.location.href = 'lessons.html?completed=' + lid;
    return;
  }
  document.getElementById('summaryOverlay').style.display = 'none';
  loadCards();
}

function goNextHsk() {
  const nextVal = document.getElementById('summaryNextBtn').dataset.nextVal;
  if (!nextVal) return;
  markCurrentLessonComplete();
  document.getElementById('hskFilter').value = nextVal;
  document.getElementById('summaryOverlay').style.display = 'none';
  loadCards();
}

function renderVocabList() {
  if (!cards.length) {
    document.getElementById('vocabList').innerHTML = `
      <div class="col-12">
        <div class="empty-vocab text-center">
          Chưa có dữ liệu từ vựng cho lựa chọn này.
        </div>
      </div>`;
    return;
  }
  document.getElementById('vocabList').innerHTML = cards.map((v, i) => `
    <div class="col-6 col-md-4 col-lg-3">
      <div class="vocab-card" onclick="currentIdx=${i};renderCard();window.scrollTo({top:0,behavior:'smooth'})">
        <div class="hanzi">${v.hanzi}</div>
        <div class="pinyin">${v.pinyin}</div>
        <span class="tone-mark" style="background:${TONES[v.tone]||TONES[0]}">Thanh ${v.tone || '·'}</span>
        <div class="meaning">${v.meaning}</div>
      </div>
    </div>`).join('');
}

// logout() provided by helpers.js

// Init
// Đọc ?lesson= từ URL để tự chọn đúng bài
(function() {
  const params = new URLSearchParams(location.search);
  const lid = params.get('lesson');
  if (lid) {
    const sel = document.getElementById('hskFilter');
    const opt = sel.querySelector(`option[value="lesson_${lid}"]`);
    if (opt) sel.value = 'lesson_' + lid;
  }
})();
loadCards().then(() => {
  const mode = new URLSearchParams(location.search).get('mode');
  if (mode === 'list') {
    document.getElementById('vocabList').scrollIntoView({ behavior:'smooth', block:'start' });
  }
});
