/**
 * LESSON MODEL
 */
const { sql, query } = require('../config/db');

// Demo data fallback khi DB chưa seed đủ
const DEMO_LESSONS = [
  { id:1,  hsk_level:1, title:'Chào Hỏi Cơ Bản',    description:'你好、谢谢、对不起、再见',          word_count:12, duration_minutes:15, emoji:'👋', order_index:1  },
  { id:2,  hsk_level:1, title:'Số Đếm 1-10',         description:'一·二·三·四·五·十',              word_count:10, duration_minutes:10, emoji:'🔢', order_index:2  },
  { id:3,  hsk_level:1, title:'Màu Sắc',             description:'红色·蓝色·绿色·黄色',            word_count:8,  duration_minutes:12, emoji:'🎨', order_index:3  },
  { id:4,  hsk_level:1, title:'Gia Đình',             description:'爸爸·妈妈·哥哥·姐姐',            word_count:14, duration_minutes:18, emoji:'👨‍👩‍👧‍👦', order_index:4  },
  { id:5,  hsk_level:1, title:'Thức Ăn & Đồ Uống',  description:'饭·水·茶·咖啡·面包',             word_count:16, duration_minutes:20, emoji:'🍜', order_index:5  },
  { id:6,  hsk_level:1, title:'Thời Gian',           description:'今天·明天·昨天·几点',             word_count:12, duration_minutes:15, emoji:'🕐', order_index:6  },
  { id:7,  hsk_level:2, title:'Mua Sắm',             description:'多少钱·便宜·贵·买·卖',           word_count:18, duration_minutes:22, emoji:'🛍️', order_index:7  },
  { id:8,  hsk_level:2, title:'Giao Thông',          description:'公交车·地铁·出租车·骑车',         word_count:15, duration_minutes:18, emoji:'🚌', order_index:8  },
  { id:9,  hsk_level:2, title:'Sức Khỏe',            description:'医院·医生·头疼·发烧',            word_count:20, duration_minutes:25, emoji:'🏥', order_index:9  },
  { id:10, hsk_level:3, title:'Thời Tiết',           description:'天气·下雨·晴天·刮风·温度',        word_count:22, duration_minutes:28, emoji:'⛅', order_index:10 },
  { id:11, hsk_level:3, title:'Du Lịch',             description:'旅游·护照·酒店·飞机·签证',        word_count:25, duration_minutes:30, emoji:'✈️', order_index:11 },
  { id:12, hsk_level:4, title:'Công Việc',           description:'工作·公司·上班·老板·薪水',        word_count:30, duration_minutes:35, emoji:'💼', order_index:12 },
  { id:13, hsk_level:4, title:'Cảm Xúc',            description:'高兴·难过·生气·担心·紧张',        word_count:28, duration_minutes:32, emoji:'😊', order_index:13 },
  { id:14, hsk_level:5, title:'Kinh Tế',            description:'经济·市场·投资·发展·竞争',        word_count:35, duration_minutes:40, emoji:'📈', order_index:14 },
  { id:15, hsk_level:5, title:'Giáo Dục',           description:'教育·大学·考试·毕业·奖学金',      word_count:32, duration_minutes:38, emoji:'🎓', order_index:15 },
  { id:16, hsk_level:6, title:'Triết Học & Văn Hóa',description:'哲学·文化·传统·思想·精神',        word_count:55, duration_minutes:60, emoji:'🏛️', order_index:16 },
  { id:17, hsk_level:6, title:'Chính Trị & Xã Hội', description:'政治·社会·制度·民主·改革',        word_count:60, duration_minutes:65, emoji:'⚖️', order_index:17 },
];

const LessonModel = {

  DEMO_LESSONS,

  async getAll({ hsk_level, limit = 50, offset = 0 }) {
    try {
      const where = hsk_level ? 'WHERE hsk_level=@level' : '';
      const r = await query(
        `SELECT id, hsk_level, title, description, word_count, duration_minutes, emoji, order_index
         FROM Lessons ${where}
         ORDER BY hsk_level, order_index
         OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
        {
          ...(hsk_level && { level: { type: sql.Int, value: parseInt(hsk_level) } }),
          offset: { type: sql.Int, value: parseInt(offset) },
          limit:  { type: sql.Int, value: parseInt(limit)  },
        }
      );
      return { lessons: r.recordset, fromDB: true };
    } catch {
      const lessons = hsk_level
        ? DEMO_LESSONS.filter(l => l.hsk_level === parseInt(hsk_level))
        : DEMO_LESSONS;
      return { lessons, fromDB: false };
    }
  },

  async findById(id) {
    const demo = DEMO_LESSONS.find(l => l.id === parseInt(id));
    try {
      const r = await query(
        `SELECT id, hsk_level, title, description, word_count, duration_minutes, emoji
         FROM Lessons WHERE id=@id`,
        { id: { type: sql.Int, value: parseInt(id) } }
      );
      return r.recordset[0] || demo || null;
    } catch {
      return demo || null;
    }
  },

  async saveProgress({ userId, lessonId, score, timeSpent }) {
    const existing = await query(
      `SELECT completed FROM UserProgress WHERE user_id=@uid AND lesson_id=@lid`,
      {
        uid: { type: sql.Int, value: userId },
        lid: { type: sql.Int, value: lessonId },
      }
    );
    const alreadyCompleted = existing.recordset[0]?.completed === true || existing.recordset[0]?.completed === 1;

    await query(
      `MERGE UserProgress AS t
       USING (VALUES (@uid,@lid)) AS s(user_id,lesson_id)
       ON t.user_id=s.user_id AND t.lesson_id=s.lesson_id
       WHEN MATCHED THEN UPDATE SET completed=1,score=@score,updated_at=GETDATE()
       WHEN NOT MATCHED THEN INSERT (user_id,lesson_id,completed,score,time_spent,created_at)
         VALUES (@uid,@lid,1,@score,@time,GETDATE())`,
      {
        uid:   { type: sql.Int, value: userId   },
        lid:   { type: sql.Int, value: lessonId },
        score: { type: sql.Int, value: score    },
        time:  { type: sql.Int, value: timeSpent },
      }
    );

    return { alreadyCompleted };
  },
};

module.exports = LessonModel;
