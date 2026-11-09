/**
 * Tool to generate duoihinhbatchu-data.js with 62 high-quality proverbs, idioms, and allusions.
 */
const fs = require('fs');
const path = require('path');

const questions = [
  {
    id: 1,
    phrase: "Ếch ngồi đáy giếng",
    category: "Thành ngữ",
    hint: "4 từ • Tầm nhìn hạn hẹp nhưng tự phụ",
    explanation: "Ý nghĩa: Xuất phát từ ngụ ngôn dân gian, con ếch sống lâu ngày dưới đáy giếng cạn, ngước nhìn lên chỉ thấy khoảng trời bé bằng miệng vung nên cứ tưởng trời chỉ có thế. Khuyên con người không nên tự mãn, hạn hẹp trong hiểu biết.",
    visual: {
      type: "well_frog",
      elements: [
        { label: "Miệng giếng hẹp", desc: "Vòm đá tròn nhìn lên trời xanh nhỏ tí" },
        { label: "Đáy giếng sâu", desc: "Tối tăm, rêu phong ẩm ướt" },
        { label: "Chú ếch xanh", desc: "Ngồi khoanh tay nghênh ngang ngước nhìn lên" }
      ]
    }
  },
  {
    id: 2,
    phrase: "Nước đổ đầu vịt",
    category: "Thành ngữ",
    hint: "4 từ • Khuyên bảo bao nhiêu cũng vô ích",
    explanation: "Ý nghĩa: Lông loài vịt có lớp màng dầu tự nhiên chống thấm, nước dội lên đầu lập tức trượt tuột đi mất. Dùng để chỉ việc dạy dỗ, nhắc nhở ai đó nhưng họ không tiếp thu, không lưu lại chút gì trong đầu.",
    visual: {
      type: "duck_water",
      elements: [
        { label: "Gáo nước đổ xối xả", desc: "Tia nước ào ào xối từ trên cao" },
        { label: "Đầu chú vịt", desc: "Nước trượt văng tứ phía không dính một giọt" },
        { label: "Dấu trượt tuột", desc: "Mũi tên trượt tuột bay đi" }
      ]
    }
  },
  {
    id: 3,
    phrase: "Đàn gảy tai trâu",
    category: "Thành ngữ",
    hint: "4 từ • Nói điều cao sâu với người không hiểu",
    explanation: "Ý nghĩa: Bắt nguồn từ điển cố phương Đông: một nhạc sĩ tài hoa gảy khúc nhạc thanh cao bên tai trâu nhưng trâu vẫn thản nhiên cắm cúi nhai cỏ. Chỉ việc giảng giải điều đạo lý hay học thuật sâu xa cho kẻ không có khả năng thấu hiểu.",
    visual: {
      type: "buffalo_harp",
      elements: [
        { label: "Cây đàn tỳ bà", desc: "Phát ra các nốt nhạc thanh tao bay lượn" },
        { label: "Tai chú trâu to", desc: "Nốt nhạc bay thẳng vào tai trâu rồi bay tuột đi" },
        { label: "Chú trâu nhai cỏ", desc: "Vẻ mặt ngơ ngác tiếp tục gặm bó cỏ" }
      ]
    }
  },
  {
    id: 4,
    phrase: "Môi hở răng lạnh",
    category: "Thành ngữ",
    hint: "4 từ • Mối quan hệ khăng khít, liên đới sinh tử",
    explanation: "Ý nghĩa: Môi và răng che chở cho nhau, môi mà hở ra thì gió lạnh lùa buốt tận chân răng. Điển tích thời Chiến Quốc (Tấn diệt Quắc rồi diệt Ngu). Chỉ những người, quốc gia láng giềng kề cận, môi hở thì răng tất phải lạnh buốt.",
    visual: {
      type: "lips_teeth_cold",
      elements: [
        { label: "Đôi môi hé mở", desc: "Môi vẽ màu đỏ hé mở rộng" },
        { label: "Hàm răng run rẩy", desc: "Răng va lập cập, có vệt băng tuyết" },
        { label: "Cơn gió đông tuyết lạnh", desc: "Bông tuyết xanh và làn gió buốt giá thổi vào" }
      ]
    }
  },
  {
    id: 5,
    phrase: "Cõng rắn cắn gà nhà",
    category: "Thành ngữ",
    hint: "5 từ • Rước kẻ xấu bên ngoài về hại người mình",
    explanation: "Ý nghĩa: Đem kẻ nguy hiểm, độc ác từ bên ngoài vào nhà để rồi chính người thân, giống nòi của mình bị cắn xé, hãm hại. Phê phán hành vi phản bội, rước giặc vào nhà.",
    visual: {
      type: "carry_snake_chicken",
      elements: [
        { label: "Người cõng trên lưng", desc: "Bóng người gù lưng cõng con mãng xà" },
        { label: "Con rắn độc há miệng", desc: "Rắn ngoái đầu dài ngoằng bổ nhào xuống" },
        { label: "Con gà trống trong chuồng", desc: "Chuồng gà nhà đang sợ hãi kêu quang quác" }
      ]
    }
  },
  {
    id: 6,
    phrase: "Vỏ quýt dày có móng tay nhọn",
    category: "Tục ngữ",
    hint: "7 từ • Kẻ gian manh gặp người cao tay trị lại",
    explanation: "Ý nghĩa: Quả quýt có lớp vỏ dày khó bóc tưởng không ai làm gì được, nhưng lại gặp bàn tay có móng nhọn sắc bén găm vào bóc sạch. Bất kỳ sự tinh ma, khó khăn nào cũng sẽ có phương cách, người tài cao hơn giải quyết.",
    visual: {
      type: "tangerine_nail",
      elements: [
        { label: "Quả quýt vỏ dày", desc: "Quả quýt to có lớp vỏ xù xì dày cộm" },
        { label: "Móng tay sắc nhọn", desc: "Ngón tay có móng vuốt nhọn hoắt bóng loáng" },
        { label: "Vết bóc xuyên qua", desc: "Móng tay cắm xuyên lớp vỏ dày ngọt ngào" }
      ]
    }
  },
  {
    id: 7,
    phrase: "Cá chép hoá rồng",
    category: "Điển tích",
    hint: "4 từ • Vượt vũ môn, thành công rực rỡ",
    explanation: "Ý nghĩa: Tích cổ kể rằng cá chép kiên trì vượt qua ba tầng sóng dữ thác Vũ Môn, đến tầng cuối cùng mây mưa sấm chớp kéo đến và thân cá biến thành rồng bay vút lên trời. Biểu trưng cho sự kiên trì vượt khó và thăng tiến vĩ đại.",
    visual: {
      type: "carp_dragon",
      elements: [
        { label: "Thác nước Vũ Môn", desc: "Ngọn thác cao trập trùng sóng cuộn" },
        { label: "Cá chép vượt thác", desc: "Nửa thân sau là cá chép quẫy đuôi" },
        { label: "Đầu rồng mọc sừng", desc: "Nửa thân trước mọc râu rồng, sừng rồng phun ngọc" }
      ]
    }
  },
  {
    id: 8,
    phrase: "Lá lành đùm lá rách",
    category: "Tục ngữ",
    hint: "5 từ • Đạo lý tương thân tương ái, cưu mang",
    explanation: "Ý nghĩa: Chiếc lá chuối to lành lặn gói bọc lấy chiếc lá non xơ xác rách mép để cùng vượt qua mưa bão. Tinh thần truyền thống của người Việt: người có điều kiện giúp đỡ người nghèo khổ, hoạn nạn.",
    visual: {
      type: "leaves_shelter",
      elements: [
        { label: "Chiếc lá xanh to lành", desc: "Lá chuối xanh mướt uốn vòng cung bao bọc" },
        { label: "Chiếc lá nhỏ tơi tả", desc: "Chiếc lá vàng khô khuyết rách nằm gọn bên trong" },
        { label: "Sợi dây lạt quấn quanh", desc: "Dây buộc đùm bọc êm ấm" }
      ]
    }
  },
  {
    id: 9,
    phrase: "Đục nước béo cò",
    category: "Thành ngữ",
    hint: "4 từ • Lợi dụng lúc hỗn loạn để kiếm lợi",
    explanation: "Ý nghĩa: Khi dòng nước bị quấy đục ngầu, lũ cá bị ngạt phải ngoi lên tầng mặt, con cò chỉ việc đứng chờ sẵn tha hồ gắp cá no nê. Ám chỉ những kẻ trục lợi cá nhân trên sự bất ổn, gian nan của tập thể.",
    visual: {
      type: "muddy_water_stork",
      elements: [
        { label: "Vùng nước bùn đục xoáy", desc: "Sóng nước màu nâu đục ngầu xáo động" },
        { label: "Đàn cá ngoi lên", desc: "Lũ cá cay mắt ngộp thở ngoi đầu" },
        { label: "Chú cò mỏ dài bụng bự", desc: "Cò vỗ cánh hả hê mổ ngoạm lia lịa" }
      ]
    }
  },
  {
    id: 10,
    phrase: "Gắp lửa bỏ tay người",
    category: "Thành ngữ",
    hint: "5 từ • Vu khống, gieo tai hoạ cho người vô tội",
    explanation: "Ý nghĩa: Dùng đôi đũa gắp cục than hồng rực đang cháy bỏ vào lòng bàn tay của người khác để họ bị phỏng và chịu tội thay mình. Chỉ hành vi thâm hiểm, vu oan giá họa cho người ngay thẳng.",
    visual: {
      type: "charcoal_tongs_hand",
      elements: [
        { label: "Đôi đũa gắp than", desc: "Cặp kẹp/đũa gắp hòn than đỏ rực tóe tia lửa" },
        { label: "Hòn than rực lửa", desc: "Cục than cháy hừng hực bốc khói đen" },
        { label: "Bàn tay vô tội giơ ra", desc: "Bàn tay người khác hứng lấy tai họa bất ngờ" }
      ]
    }
  },
  {
    id: 11,
    phrase: "Bút sa gà chết",
    category: "Thành ngữ",
    hint: "4 từ • Ký văn bản sai lầm là nhận hậu quả ngay",
    explanation: "Ý nghĩa: Thời xưa các vụ kiện tụng, giấy tờ chỉ cần quan hoặc người làm chứng đặt ngọn bút ký phê một chữ là có thể định đoạt số phận, thậm chí nhà mất của mất gà. Khuyên răn phải suy tính kỹ trước khi đặt bút ký giấy tờ cam kết.",
    visual: {
      type: "pen_ink_chicken",
      elements: [
        { label: "Cây bút máy / lông", desc: "Ngòi bút chấm mực đen rơi chữ ký xuống giấy" },
        { label: "Tờ giấy ký tên", desc: "Tờ đơn có dấu mộc và chữ ký ngoằn ngoèo" },
        { label: "Con gà lăn đùng", desc: "Chú gà trống hai mắt dấu X quay tơ" }
      ]
    }
  },
  {
    id: 12,
    phrase: "Tre già măng mọc",
    category: "Tục ngữ",
    hint: "4 từ • Thế hệ sau kế thừa thế hệ trước",
    explanation: "Ý nghĩa: Quy luật tự nhiên của luỹ tre: khi cây tre già cỗi đi thì những búp măng non xanh tốt đã nhú lên đón ánh mặt trời để tiếp nối. Khẳng định sự tiếp bước liên tục và tất yếu giữa các thế hệ con người.",
    visual: {
      type: "bamboo_sprout",
      elements: [
        { label: "Thân tre già cao lớn", desc: "Ống tre già ngả bóng chở che" },
        { label: "Búp măng non nhọn hoắt", desc: "Mầm măng tươi non xanh mởn vươn thẳng đứng" },
        { label: "Tầng lá non xanh", desc: "Chồi non tràn đầy sức sống mới" }
      ]
    }
  },
  {
    id: 13,
    phrase: "Khắc cốt ghi tâm",
    category: "Thành ngữ",
    hint: "4 từ • Ghi nhớ ơn nghĩa sâu nặng vào tận đáy lòng",
    explanation: "Ý nghĩa: Khắc vào trong xương cốt, ghi vào sâu tận con tim. Thể hiện sự tri ân, ghi nhớ ân tình hay bài học sâu sắc suốt đời không bao giờ phai nhạt.",
    visual: {
      type: "bone_heart_engrave",
      elements: [
        { label: "Hình trái tim đỏ rực", desc: "Trái tim kiên định ở trung tâm" },
        { label: "Khung xương chắc chắn", desc: "Biểu tượng xương cốt bền bỉ" },
        { label: "Nét dao khắc chữ 'ƠN'", desc: "Mũi dao khắc sâu chữ sáng ánh hào quang" }
      ]
    }
  },
  {
    id: 14,
    phrase: "Cờ bạc là bác thằng bần",
    category: "Tục ngữ",
    hint: "6 từ • Sa vào đỏ đen ắt dẫn đến trắng tay nghèo khổ",
    explanation: "Ý nghĩa: Đỏ đen cờ bạc là người bà con thân thích nhất dẫn dắt con người ta đến thân phận kẻ nghèo khổ bần cùng. Lời cảnh tỉnh sâu sắc về tác hại tan gia bại sản do tệ nạn cờ bạc.",
    visual: {
      type: "dice_poor_man",
      elements: [
        { label: "Cặp xúc xắc & quân bài", desc: "Quân xí ngầu đỏ đen và lá bài xòe" },
        { label: "Mũi tên chỉ lối", desc: "Đường dẫn dắt trực tiếp đi xuống dốc" },
        { label: "Người nghèo rách rưới", desc: "Anh chàng quần áo rách vá víu cầm bát rỗng" }
      ]
    }
  },
  {
    id: 15,
    phrase: "Ngưu tầm ngưu mã tầm mã",
    category: "Thành ngữ",
    hint: "6 từ • Người cùng chí hướng, thói quen tìm đến nhau",
    explanation: "Ý nghĩa: Trâu đi tìm trâu, ngựa đi tìm ngựa kết thành bầy đàn. Ý chỉ những người có cùng tính cách, sở thích, đẳng cấp hoặc mưu tính (thường dùng hàm ý mỉa mai kẻ xấu cấu kết cùng đồng bọn) thường tụ họp với nhau.",
    visual: {
      type: "cow_cow_horse_horse",
      elements: [
        { label: "Hai chú trâu sát cánh", desc: "Đôi trâu sừng cong ngoắc đuôi cụng trán" },
        { label: "Hai chú ngựa hí vang", desc: "Đôi ngựa bờm dài cùng phi nước đại cạnh nhau" },
        { label: "Vòng tròn liên kết", desc: "Vòng xoay tìm về cùng một phe" }
      ]
    }
  },
  {
    id: 16,
    phrase: "Há miệng chờ sung",
    category: "Thành ngữ",
    hint: "4 từ • Kẻ lười biếng chỉ mong vận may từ trên trời rơi xuống",
    explanation: "Ý nghĩa: Người lười biếng nằm ngửa dưới gốc cây sung, há to miệng cả ngày chỉ đợi quả sung chín tự rụng vào mồm ăn. Phê phán thái độ lười lao động, ỷ lại và mơ mộng hảo huyền.",
    visual: {
      type: "open_mouth_fig",
      elements: [
        { label: "Người nằm ngửa lười nhác", desc: "Người gối tay dưới cỏ há to miệng ngủ" },
        { label: "Cành sung trĩu quả", desc: "Cành cây lúc lỉu những quả sung màu tím hồng" },
        { label: "Quả sung đang rơi", desc: "Quả sung lơ lửng rơi chậm về hướng miệng" }
      ]
    }
  },
  {
    id: 17,
    phrase: "Mèo mù vớ cá rán",
    category: "Thành ngữ",
    hint: "5 từ • Kẻ kém cỏi bất ngờ gặp may mắn lớn",
    explanation: "Ý nghĩa: Con mèo bị mù hai mắt quờ quạng lại vô tình vớ ngay được đĩa cá rán thơm lừng béo ngậy. Chỉ sự may mắn ngẫu nhiên gặp được điều tốt lành mà bản thân chẳng có tài năng hay công sức gì.",
    visual: {
      type: "blind_cat_fried_fish",
      elements: [
        { label: "Chú mèo đeo kính đen", desc: "Mèo quờ tay mò mẫm đôi chân trước" },
        { label: "Đĩa cá rán vàng giòn", desc: "Đĩa cá rán thơm phức bốc khói lượn sóng" },
        { label: "Ngôi sao may mắn", desc: "Dấu chấm than và sao phát sáng bất ngờ" }
      ]
    }
  },
  {
    id: 18,
    phrase: "Nuôi ong tay áo",
    category: "Thành ngữ",
    hint: "4 từ • Dung dưỡng kẻ phản phúc ngay cạnh mình",
    explanation: "Ý nghĩa: Đem bầy ong độc nuôi ngay trong ống tay áo của mình, để rồi chính bầy ong đó quay lại chích đốt nọc độc. Chỉ sự dại dột khi cưu mang kẻ lòng lang dạ sói, phản phúc hại người nâng đỡ.",
    visual: {
      type: "bees_in_sleeve",
      elements: [
        { label: "Ống tay áo lụa rộng", desc: "Vạt áo truyền thống màu thẫm buông rủ" },
        { label: "Bầy ong vàng đen", desc: "Đàn ong có ngòi chích nhọn bay túa ra từ cổ tay" },
        { label: "Tổ ong mật bí mật", desc: "Tổ ong lục giác giấu bên trong nếp áo" }
      ]
    }
  },
  {
    id: 19,
    phrase: "Ném đá giấu tay",
    category: "Thành ngữ",
    hint: "4 từ • Ngấm ngầm hại người rồi tỏ vẻ vô can",
    explanation: "Ý nghĩa: Bàn tay vừa ném hòn đá to trúng người khác liền giấu biến ra sau lưng, làm bộ mặt ngây thơ vô tội như chưa từng có chuyện gì. Phê phán kẻ tiểu nhân đê hèn, thích hãm hại sau lưng.",
    visual: {
      type: "throw_stone_hide_hand",
      elements: [
        { label: "Hòn đá đang bay vèo", desc: "Hòn đá có vệt quỹ đạo gió xé rách" },
        { label: "Bàn tay giấu sau lưng", desc: "Cánh tay quặt ra sau lưng nắm chặt" },
        { label: "Mặt người giả vờ ngơ ngác", desc: "Mắt liếc nhìn hướng khác làm bộ ngây thơ" }
      ]
    }
  },
  {
    id: 20,
    phrase: "Thùng rỗng kêu to",
    category: "Thành ngữ",
    hint: "4 từ • Kẻ nông cạn, thiếu kiến thức thường thích ba hoa",
    explanation: "Ý nghĩa: Chiếc thùng gỗ rỗng tuếch không đựng gì bên trong thì khi gõ vào sẽ phát ra tiếng vang dội lớn nhất. Người có học thức ít thường thích lớn giọng khoe khoang để che đậy sự trống rỗng.",
    visual: {
      type: "empty_barrel_loud",
      elements: [
        { label: "Thùng phuy gỗ rỗng không", desc: "Miệng thùng mở toe hoét bên trong đen sì không hạt thóc" },
        { label: "Chiếc dùi gõ vào thân", desc: "Dùi gõ nảy lửa trên vành thùng" },
        { label: "Sóng âm thanh lan toả", desc: "Các vòng sóng âm cực lớn bùng nổ xung quanh" }
      ]
    }
  },
  {
    id: 21,
    phrase: "Đao to búa lớn",
    category: "Thành ngữ",
    hint: "4 từ • Lời lẽ khoa trương, đao to búa lớn thị uy",
    explanation: "Ý nghĩa: Dùng vũ khí quá khổ như đại đao khổng lồ và búa tạ sấm sét để làm việc nhỏ, hoặc nói năng hùng hổ cường điệu để dọa dẫm, phô trương thanh thế.",
    visual: {
      type: "huge_blade_hammer",
      elements: [
        { label: "Thanh đại đao sáng loáng", desc: "Lưỡi đao sắc bén ánh kim bắt chéo" },
        { label: "Cây búa tạ sấm sét", desc: "Đầu búa sắt khổng lồ nện nứt vỡ mặt đất" },
        { label: "Tia sét uy lực", desc: "Tia sét nổ xung quanh thể hiện thanh thế" }
      ]
    }
  },
  {
    id: 22,
    phrase: "Uống nước nhớ nguồn",
    category: "Tục ngữ",
    hint: "4 từ • Đạo lý tri ân cội nguồn, tổ tiên",
    explanation: "Ý nghĩa: Khi uống dòng nước mát lành ngọt ngào phải nhớ đến ngọn suối cội nguồn nơi dòng nước bắt đầu sinh ra. Dạy con người luôn biết ơn các bậc tiền nhân, cha mẹ, người đã tạo dựng thành quả cho ta hưởng thụ.",
    visual: {
      type: "drink_water_remember_source",
      elements: [
        { label: "Bát nước suối mát", desc: "Đôi tay nâng chén nước suối trong veo" },
        { label: "Dòng suối uốn lượn", desc: "Dòng nước xanh biếc chảy xuôi qua ghềnh đá" },
        { label: "Đỉnh núi mây ngàn cội nguồn", desc: "Ngọn núi cao sừng sững nơi khởi nguồn mạch nước" }
      ]
    }
  },
  {
    id: 23,
    phrase: "Ăn cháo đá bát",
    category: "Thành ngữ",
    hint: "4 từ • Kẻ bội bạc, phản ơn người đã cưu mang",
    explanation: "Ý nghĩa: Vừa ăn hết bát cháo cứu đói liền vung chân đá tung cái bát sứ vỡ vụn. Lên án gay gắt những kẻ vong ân bội nghĩa, vừa nhận được sự giúp đỡ xong đã quay lưng xúc phạm ân nhân.",
    visual: {
      type: "eat_congee_kick_bowl",
      elements: [
        { label: "Bát cháo thơm dở", desc: "Hạt gạo nở hoa, khói nóng bốc lên" },
        { label: "Chiếc giày vung đá", desc: "Bàn chân mang giày vung cú đá mạnh bạo" },
        { label: "Mảnh bát vỡ tung tóe", desc: "Bát sứ nứt vỡ văng lên không trung" }
      ]
    }
  },
  {
    id: 24,
    phrase: "Cháy nhà ra mặt chuột",
    category: "Thành ngữ",
    hint: "5 từ • Biến cố xảy ra mới lộ bộ mặt kẻ xấu",
    explanation: "Ý nghĩa: Loài chuột ngày thường ẩn nấp kỹ trong hang hốc xà nhà, chỉ khi ngọn lửa thiêu rụi mái nhà thì đàn chuột mới hoảng loạn túa ra lộ nguyên hình. Khi thử thách biến cố ập đến, kẻ xấu xa cơ hội mới bị vạch trần.",
    visual: {
      type: "burning_house_rats",
      elements: [
        { label: "Ngôi nhà bốc cháy", desc: "Mái nhà gỗ ngập chìm trong ngọn lửa đỏ cam" },
        { label: "Lũ chuột hốt hoảng", desc: "Đàn chuột mắt lấm lét bò túa ra từ góc kẹt" },
        { label: "Khói đen cuồn cuộn", desc: "Khói mù mịt làm lộ tẩy mọi ngóc ngách" }
      ]
    }
  },
  {
    id: 25,
    phrase: "Tránh vỏ dưa gặp vỏ dừa",
    category: "Tục ngữ",
    hint: "6 từ • Tránh cái rủi nhỏ lại đụng ngay cái hoạ lớn",
    explanation: "Ý nghĩa: Vừa cẩn thận bước chân né mẩu vỏ dưa hấu trơn trượt thì lại giẫm trúng ngay gáo dừa khô cứng làm ngã đau điếng. Nói về tình cảnh vừa thoát khỏi khó khăn này lại vấp phải khó khăn khác gay go hơn.",
    visual: {
      type: "watermelon_coconut_shell",
      elements: [
        { label: "Mẩu vỏ dưa hấu đỏ xanh", desc: "Vỏ dưa cong trơn tuột nằm bên trái" },
        { label: "Bàn chân nhảy tránh", desc: "Bàn chân nhón lên né tránh khéo léo" },
        { label: "Gáo vỏ dừa khô cứng", desc: "Gáo dừa nâu sẫm nhọn hoắt đón sẵn bên phải" }
      ]
    }
  },
  {
    id: 26,
    phrase: "Đi guốc trong bụng",
    category: "Thành ngữ",
    hint: "5 từ • Nắm rõ chân tơ kẽ tóc suy nghĩ của người khác",
    explanation: "Ý nghĩa: Ví von mình hiểu thấu từng ngóc ngách tâm can, suy nghĩ thầm kín của ai đó như thể đi lại bằng đôi guốc gõ lộc cộc ngay trong ruột gan của họ.",
    visual: {
      type: "clogs_in_belly",
      elements: [
        { label: "Đôi guốc mộc quai đỏ", desc: "Guốc gỗ truyền thống bước đi nhịp nhàng" },
        { label: "Hình dạ dày / ổ bụng", desc: "Đường viền giải phẫu dạ dày uốn cong hồng hào" },
        { label: "Dấu chân lộc cộc", desc: "Nốt bước chân in hằn rõ mồn một bên trong" }
      ]
    }
  },
  {
    id: 27,
    phrase: "Đầu voi đuôi chuột",
    category: "Thành ngữ",
    hint: "4 từ • Bắt đầu rầm rộ nhưng kết thúc nhỏ nhoi, tệ hại",
    explanation: "Ý nghĩa: Mở đầu dự án, sự việc thì rầm rộ phô trương như thân hình khổng lồ của voi, nhưng khi kết thúc lại teo tóp, cụt lủn và vụn vặt như cái đuôi chuột nhắt.",
    visual: {
      type: "elephant_head_mouse_tail",
      elements: [
        { label: "Đầu con voi đồ sộ", desc: "Vòi dài uốn lượn, đôi ngà trắng ngời uy phong" },
        { label: "Thân hình teo nhỏ dần", desc: "Mình thu hẹp gầy gò kỳ dị" },
        { label: "Chiếc đuôi chuột ngoằn ngoèo", desc: "Đuôi chuột nhắt bé tí tẹo cụp xuống" }
      ]
    }
  },
  {
    id: 28,
    phrase: "Tay làm hàm nhai",
    category: "Tục ngữ",
    hint: "4 từ • Chăm chỉ lao động thì mới có cái ăn no ấm",
    explanation: "Ý nghĩa: Đôi bàn tay chịu khó cấy cày làm lụng vất vả thì cơ hàm miệng mới có thức ăn nhai ngon lành. Khẳng định giá trị của lao động chân chính là nguồn gốc nuôi sống bản thân và gia đình.",
    visual: {
      type: "working_hands_chewing_jaw",
      elements: [
        { label: "Đôi bàn tay cần mẫn", desc: "Bàn tay chai sần cầm bó lúa vàng óng" },
        { label: "Khuôn miệng tươi tắn", desc: "Hàm răng nhai hạt cơm thơm ấm nóng" },
        { label: "Bát cơm đầy ắp", desc: "Chén cơm trắng dẻo nghi ngút khói thơm" }
      ]
    }
  },
  {
    id: 29,
    phrase: "Giấu đầu hở đuôi",
    category: "Thành ngữ",
    hint: "4 từ • Che đậy vụng về làm lộ tẩy mọi chuyện",
    explanation: "Ý nghĩa: Con thú rúc đầu vào bụi cỏ tưởng không ai nhìn thấy, nhưng chiếc đuôi dài ngoẵng lại chỏng chơ lộ ra ngoài. Ám chỉ sự che giấu tội lỗi, sơ hở vụng về khiến ai nhìn vào cũng phát hiện ra.",
    visual: {
      type: "hide_head_show_tail",
      elements: [
        { label: "Cái đầu trùm kín giẻ", desc: "Đầu rúc sâu vào hốc tối che đậy" },
        { label: "Chiếc đuôi dài xù lông", desc: "Đuôi dựng đứng vểnh cao lù lù bên ngoài" },
        { label: "Vòng tròn chú ý", desc: "Mũi tên đỏ chỉ thẳng vào cái đuôi lộ tẩy" }
      ]
    }
  },
  {
    id: 30,
    phrase: "Gừng càng già càng cay",
    category: "Tục ngữ",
    hint: "5 từ • Càng lớn tuổi càng tích luỹ nhiều kinh nghiệm sắc sảo",
    explanation: "Ý nghĩa: Củ gừng khi mới nhú thì mềm nhạt, nhưng càng già qua thời gian củ càng đặc quánh và vị cay nồng gắt. Ca ngợi giá trị tri thức, sự lão luyện và bản lĩnh của người lớn tuổi từng trải.",
    visual: {
      type: "old_ginger_spicy",
      elements: [
        { label: "Củ gừng già gân guốc", desc: "Củ gừng sần sùi nhiều nhánh rễ cổ thụ" },
        { label: "Lửa cay bốc khói", desc: "Tia lửa và luồng khói cay nồng cuộn lên" },
        { label: "Biểu tượng ớt & ngọn lửa", desc: "Biểu trưng độ cay cấp số nhân" }
      ]
    }
  },
  {
    id: 31,
    phrase: "Treo đầu dê bán thịt chó",
    category: "Thành ngữ",
    hint: "6 từ • Gian lận thương mại, nói một đằng làm một nẻo",
    explanation: "Ý nghĩa: Ngoài cửa tiệm treo bảng đầu dê có sừng thanh lịch làm mồi câu, nhưng bên trong lại bày ra bán thịt chó chất lượng khác hẳn. Phê phán lối làm ăn lừa bịp, quảng cáo dối trá.",
    visual: {
      type: "goat_head_dog_meat",
      elements: [
        { label: "Đầu chú dê sừng cong", desc: "Đầu dê gắn móc treo lủng lẳng trước cửa quán" },
        { label: "Bàn phản thịt bên trong", desc: "Phản gỗ bày các tảng thịt kèm chân chó" },
        { label: "Bảng hiệu mập mờ", desc: "Tấm biển hiệu mời chào giả dối" }
      ]
    }
  },
  {
    id: 32,
    phrase: "Mật ngọt chết ruồi",
    category: "Thành ngữ",
    hint: "4 từ • Lời nịnh hót ngọt ngào ẩn chứa cạm bẫy",
    explanation: "Ý nghĩa: Giọt mật ong ngọt lịm hấp dẫn đàn ruồi bâu vào ăn, nhưng chất dính của mật giữ chặt cánh chân khiến chúng chết chìm. Cảnh giác trước những lời tán tụng ngọt ngào dễ làm con người sa bẫy.",
    visual: {
      type: "sweet_honey_flies",
      elements: [
        { label: "Hũ mật ong vàng óng", desc: "Giọt mật vàng sánh từ muỗng gỗ rớt xuống" },
        { label: "Đàn ruồi bu quanh", desc: "Những chú ruồi sa chân dính bết vào dòng mật" },
        { label: "Vòng xoáy cạm bẫy", desc: "Vũng mật lung linh nhưng chết chóc" }
      ]
    }
  },
  {
    id: 33,
    phrase: "Chó ngáp phải ruồi",
    category: "Thành ngữ",
    hint: "4 từ • May mắn ngẫu nhiên ngoài dự tính",
    explanation: "Ý nghĩa: Chú chó đang nằm dài ngáp một hơi vu vơ thì tình cờ có con ruồi bay ngang tọt đúng vào miệng đớp được. Chỉ những thành công hoàn toàn do sự may mắn tình cờ mang lại.",
    visual: {
      type: "dog_yawn_catch_fly",
      elements: [
        { label: "Chú chó há mồm ngáp dài", desc: "Mõm chó mở hết cỡ mắt híp lại ngái ngủ" },
        { label: "Con ruồi bay lạc lối", desc: "Vệt bay zíc zắc của chú ruồi bất hạnh" },
        { label: "Điểm giao bất ngờ", desc: "Ruồi bay thẳng vào giữa hai hàm răng" }
      ]
    }
  },
  {
    id: 34,
    phrase: "Lửa thử vàng gian nan thử sức",
    category: "Tục ngữ",
    hint: "7 từ • Thử thách khó khăn rèn luyện ý chí và nhân cách",
    explanation: "Ý nghĩa: Muốn biết vàng thật hay giả phải đưa vào lò lửa tôi luyện; muốn biết con người có tài đức và nghị lực hay không phải xem cách họ đương đầu với gian truân hiểm trở.",
    visual: {
      type: "fire_gold_trial",
      elements: [
        { label: "Thỏi vàng 9999 rực rỡ", desc: "Thỏi vàng óng ả nguyên vẹn không sứt mẻ" },
        { label: "Ngọn lửa nung đỏ rực", desc: "Lò lửa than hồng cháy hừng hực bao quanh" },
        { label: "Người leo vách núi cheo leo", desc: "Bóng người đạp đá vượt dốc hiểm trở vươn lên" }
      ]
    }
  },
  {
    id: 35,
    phrase: "Thừa nước đục thả câu",
    category: "Thành ngữ",
    hint: "5 từ • Lợi dụng lúc thiên hạ rối ren để trục lợi",
    explanation: "Ý nghĩa: Canh lúc nước lũ dâng bùn đục cá không định hướng được bèn quăng cần câu giật cá. Ám chỉ những kẻ chớp thời cơ khi người khác gặp biến cố xáo trộn để vơ vét lợi ích về mình.",
    visual: {
      type: "muddy_river_fishing",
      elements: [
        { label: "Dòng xoáy nước bùn đục", desc: "Mặt nước nổi sóng màu nâu phù sa ngập ngụa" },
        { label: "Cần câu buông lưỡi", desc: "Sợi cước thả lưỡi câu sắc bén chờ sẵn" },
        { label: "Nụ cười đắc ý", desc: "Gương mặt mờ ảo rình rập giật cá" }
      ]
    }
  },
  {
    id: 36,
    phrase: "Cá lớn nuốt cá bé",
    category: "Thành ngữ",
    hint: "5 từ • Kẻ mạnh ức hiếp chèn ép kẻ yếu",
    explanation: "Ý nghĩa: Quy luật sinh tồn nghiệt ngã của đại dương: con cá to mở miệng nuốt trọn con cá nhỏ hơn. Phản ánh thực trạng xã hội bất công nơi thế lực mạnh bạo chèn ép, triệt tiêu kẻ cô thế.",
    visual: {
      type: "big_fish_eat_small",
      elements: [
        { label: "Cá mập khổng lồ há miệng", desc: "Hàm răng sắc nhọn mở rộng kinh hoàng" },
        { label: "Con cá nhỡ đang bơi trốn", desc: "Thân cá nhỡ sắp sửa rơi vào họng" },
        { label: "Đàn cá con li ti", desc: "Đàn cá nhỏ bơi tán loạn trong làn nước xanh" }
      ]
    }
  },
  {
    id: 37,
    phrase: "Tái ông thất mã",
    category: "Điển tích",
    hint: "4 từ • Hoạ trong phúc, phúc trong hoạ khôn lường",
    explanation: "Ý nghĩa: Điển tích Tái ông mất ngựa: ông già mất ngựa lại kéo được ngựa quý về, con trai cưỡi ngựa ngã gãy chân nhưng nhờ đó thoát lệnh tòng quân chết trận. Khuyên con người giữ tâm thế bình thản trước mọi đổi thay vận số.",
    visual: {
      type: "old_frontier_horse",
      elements: [
        { label: "Ông lão râu bạc bên biên giới", desc: "Phong thái điềm tĩnh mỉm cười vuốt râu" },
        { label: "Chú ngựa bạch tung vó", desc: "Con ngựa trắng phi xa rồi dẫn đàn trở về" },
        { label: "Biểu tượng âm dương biến ảo", desc: "Họa biến thành phúc, phúc tiềm ẩn họa" }
      ]
    }
  },
  {
    id: 38,
    phrase: "Rút dây động rừng",
    category: "Thành ngữ",
    hint: "4 từ • Động thái nhỏ làm xáo động toàn bộ cục diện",
    explanation: "Ý nghĩa: Chỉ kéo giật một sợi dây leo nhỏ trong bụi rậm nhưng làm lay chuyển cả tán cây, khiến cả khu rừng già rùng mình xao xác. Nhắc nhở hành động phải cẩn trọng kẻo đánh động đối phương.",
    visual: {
      type: "pull_vine_shake_forest",
      elements: [
        { label: "Bàn tay giật sợi dây leo", desc: "Ngón tay nắm sợi dây bìm bìm kéo căng" },
        { label: "Cánh rừng già nghiêng ngả", desc: "Cây cối tán lá rung rinh dữ dội" },
        { label: "Đàn chim hoảng loạn", desc: "Bầy chim vỗ cánh bay dạt khỏi tổ" }
      ]
    }
  },
  {
    id: 39,
    phrase: "Thọc gậy bánh xe",
    category: "Thành ngữ",
    hint: "4 từ • Hành vi phá hoại, cản trở việc của người khác",
    explanation: "Ý nghĩa: Bánh xe ngựa đang bon bon lăn đều trên đường thì có kẻ cầm thanh gậy gỗ chọc thẳng vào nan hoa làm bánh xe khựng lại vỡ toác. Chỉ kẻ chuyên phá đám, cản trở công việc chung.",
    visual: {
      type: "stick_in_wheel_spokes",
      elements: [
        { label: "Bánh xe gỗ đang quay", desc: "Bánh xe nan hoa lăn tròn với vệt tốc độ" },
        { label: "Cây gậy chọc ngang", desc: "Khúc gậy to cắm phập xuyên thủng nan hoa" },
        { label: "Mảnh vỡ & tia hãm khựng", desc: "Bánh xe bị kẹt phát ra tia khựng giật nảy" }
      ]
    }
  },
  {
    id: 40,
    phrase: "Đẽo cày giữa đường",
    category: "Thành ngữ",
    hint: "4 từ • Không có chính kiến, nghe lời mọi người dẫn đến thất bại",
    explanation: "Ý nghĩa: Bác thợ mộc ngồi đẽo bắp cày bên đường, người qua bảo đẽo to cũng nghe, người bảo đẽo nhỏ cũng theo, cuối cùng khúc gỗ quý thành mẩu đóm vô dụng. Phê phán người ba phải, thiếu lập trường.",
    visual: {
      type: "carve_plow_on_road",
      elements: [
        { label: "Khúc gỗ cày bị gọt dở", desc: "Khúc gỗ méo mó mỗi bên một phoi" },
        { label: "Người thợ cầm rìu phân vân", desc: "Thợ mộc gãi đầu đứng giữa đường đi" },
        { label: "Những bàn tay chỉ trỏ", desc: "Nhiều ngón tay từ 4 phía chỉ trỏ bàn tán" }
      ]
    }
  },
  {
    id: 41,
    phrase: "Qua cầu rút ván",
    category: "Thành ngữ",
    hint: "4 từ • Đạt được mục đích rồi bội bạc với ân nhân",
    explanation: "Ý nghĩa: Đi qua con sông nhờ nhịp cầu gỗ bắc ngang, vừa bước chân tới bờ an toàn liền gỡ vứt luôn thanh ván cầu để người sau không đi được. Chỉ sự phản phúc, bội nghĩa triệt đường người từng giúp mình.",
    visual: {
      type: "cross_bridge_pull_plank",
      elements: [
        { label: "Chiếc cầu bắc qua sông", desc: "Cầu gỗ nối hai bờ sông nước cuộn chảy" },
        { label: "Bóng người đã sang bờ bên kia", desc: "Người đứng ngoảnh mặt bước đi thản nhiên" },
        { label: "Tấm ván cầu bị rút ném rơi", desc: "Tấm ván rơi lơ lửng xuống dòng nước sâu" }
      ]
    }
  },
  {
    id: 42,
    phrase: "Miệng nam mô bụng một bồ dao găm",
    category: "Tục ngữ",
    hint: "8 từ • Bề ngoài tỏ vẻ thiện lương nhưng bụng dạ nham hiểm",
    explanation: "Ý nghĩa: Miệng luôn tụng câu niệm Phật từ bi 'Nam mô', nhưng bên trong thâm tâm lại chứa sẵn cả bồ dao găm sắc bén chực chờ đâm người. Lột trần những kẻ đạo đức giả nguy hiểm khôn lường.",
    visual: {
      type: "pray_lips_dagger_belly",
      elements: [
        { label: "Khuôn miệng chuỗi tràng hạt", desc: "Miệng tụng kinh chuỗi hạt niệm Phật hiền từ" },
        { label: "Cái bồ nan trong ổ bụng", desc: "Bồ mây đan kín đặt giữa khoang ngực" },
        { label: "Những lưỡi dao găm sắc lẻm", desc: "Mũi dao nhọn hoắt tua tủa chĩa ra ngoài" }
      ]
    }
  },
  {
    id: 43,
    phrase: "Nước chảy đá mòn",
    category: "Tục ngữ",
    hint: "4 từ • Kiên trì nhẫn nại thì việc khó cũng thành",
    explanation: "Ý nghĩa: Dòng nước tuy mềm mại yếu ớt nhưng cứ róc rách chảy không ngừng qua năm tháng dài đằng đẵng thì tảng đá hoa cương cứng rắn cũng phải lõm mòn. Ca ngợi sức mạnh của sự kiên trì.",
    visual: {
      type: "flowing_water_worn_stone",
      elements: [
        { label: "Dòng nước trong veo chảy xiết", desc: "Từng giọt nước tí tách nhỏ đều đặn từ trên cao" },
        { label: "Tảng đá cứng rêu phong", desc: "Khối đá tảng to lớn sừng sững" },
        { label: "Hốc lõm sâu hoắm", desc: "Lòng đá bị giọt nước khoét thủng một hõm tròn nhẵn" }
      ]
    }
  },
  {
    id: 44,
    phrase: "Gieo gió gặt bão",
    category: "Thành ngữ",
    hint: "4 từ • Gieo điều ác nhỏ sẽ nhận lại hậu quả khôn lường",
    explanation: "Ý nghĩa: Tay chỉ thả ra một cơn gió thoảng độc địa ban đầu, nhưng luật nhân quả sẽ gom thành trận bão táp sấm sét cuồng loạn giáng thẳng xuống đầu. Lời răn dạy về quy luật nhân quả báo ứng.",
    visual: {
      type: "sow_wind_reap_storm",
      elements: [
        { label: "Cơn gió xoáy nhỏ ban đầu", desc: "Luồng gió mảnh dẻ vờn nhẹ từ bàn tay" },
        { label: "Cơn bão lốc đen kịt", desc: "Đám mây đen kịt sấm chớp giật xé trời" },
        { label: "Tia sét giáng xuống", desc: "Tia sét vàng nhọn hoắt đánh gục cây cối" }
      ]
    }
  },
  {
    id: 45,
    phrase: "Đi một ngày đàng học một sàng khôn",
    category: "Tục ngữ",
    hint: "9 từ • Đi ra ngoài trải nghiệm sẽ tích lũy được nhiều tri thức",
    explanation: "Ý nghĩa: Bước chân đi ra khỏi luỹ tre làng một ngày đường sẽ mở mang tầm mắt, gom góp về được cả một chiếc sàng đan đầy ắp sự khôn ngoan và hiểu biết thực tế. Khuyên con người năng học hỏi và trải nghiệm.",
    visual: {
      type: "walk_road_learn_wisdom",
      elements: [
        { label: "Con đường dài thiên lý", desc: "Con đường uốn lượn hướng về chân trời rộng mở" },
        { label: "Chiếc sàng tre đan khéo", desc: "Nong sàng tre truyền thống nâng trên tay" },
        { label: "Những hạt ngọc trí tuệ lấp lánh", desc: "Những cuốn sách và viên ngọc sáng rực trên sàng" }
      ]
    }
  },
  {
    id: 46,
    phrase: "Mặt ủ mày chau",
    category: "Thành ngữ",
    hint: "4 từ • Khuôn mặt buồn rầu, ủ rũ đầy tâm sự lo âu",
    explanation: "Ý nghĩa: Khuôn mặt ủ rũ u sầu, đôi lông mày nhíu chặt (chau mày) lại thành nếp nhăn trĩu nặng. Miêu tả dáng vẻ sầu muộn, bế tắc hoặc mang nhiều nỗi niềm trăn trở của một người.",
    visual: {
      type: "sad_face_knitted_brows",
      elements: [
        { label: "Đôi mày nhíu chặt chữ Vát", desc: "Lông mày rủ xuống ép chặt vào giữa trán" },
        { label: "Đôi mắt u buồn rủ bóng", desc: "Ánh mắt nặng trĩu nhìn xa xăm" },
        { label: "Khóe miệng trĩu xuống", desc: "Đôi môi rũ cong xuống vẻ mặt âu lo ngậm ngùi" }
      ]
    }
  },
  {
    id: 47,
    phrase: "Chim sa cá lặn",
    category: "Thành ngữ",
    hint: "4 từ • Nhan sắc mỹ nhân tuyệt trần khuynh thành",
    explanation: "Ý nghĩa: Bắt nguồn từ điển tích Tây Thi và Chiêu Quân: sắc đẹp mê hồn đến mức chim trời nhìn thấy phải quên bay mà sà cánh xuống đất, cá dưới nước nhìn thấy phải quên bơi mà lặn sâu. Ca ngợi dung nhan tuyệt mỹ.",
    visual: {
      type: "falling_bird_diving_fish",
      elements: [
        { label: "Cánh chim sà xuống mặt hồ", desc: "Chú chim bồ câu chao cánh ngơ ngẩn đáp xuống" },
        { label: "Con cá vàng lặn sâu đáy nước", desc: "Cá chép lội xuống làn nước biếc trong veo" },
        { label: "Dung nhan mỹ nữ khuất bóng", desc: "Bóng nghiêng mỹ nhân thướt tha cầm quạt" }
      ]
    }
  },
  {
    id: 48,
    phrase: "Vụng chèo khéo chống",
    category: "Thành ngữ",
    hint: "4 từ • Làm sai kém cỏi nhưng giỏi bao biện lấp liếm",
    explanation: "Ý nghĩa: Tay chèo thuyền thì lóng ngóng vụng về làm thuyền chao đảo, nhưng khi thuyền va chạm lại rất khéo dùng cây sào chống đỡ cãi lý lấp liếm lỗi lầm. Chỉ người kém năng lực nhưng tài bao biện.",
    visual: {
      type: "clumsy_rowing_clever_prop",
      elements: [
        { label: "Mái chèo xiêu vẹo trật nhịp", desc: "Mái chèo gỗ rơi chệch mạn thuyền tóe nước" },
        { label: "Cây sào chống chắc nịch", desc: "Cây sào tre dài chống khựng mỏm đá đỡ đòn" },
        { label: "Chiếc thuyền nan chao đảo", desc: "Thuyền chao nghiêng giữa dòng nước xoáy" }
      ]
    }
  },
  {
    id: 49,
    phrase: "Hoạ từ miệng mà ra",
    category: "Thành ngữ",
    hint: "5 từ • Lời ăn tiếng nói bất cẩn sẽ rước tai vạ",
    explanation: "Ý nghĩa: Tai họa, rắc rối của đời người phần lớn bắt nguồn từ chính cái mồm nói năng xằng bậy, bốc đồng thiếu suy nghĩ. Cảnh tỉnh việc giữ gìn khẩu nghiệp, cẩn trọng trong từng lời phát ngôn.",
    visual: {
      type: "disaster_from_mouth",
      elements: [
        { label: "Chiếc miệng mở to phát ngôn", desc: "Khuôn miệng đang cao giọng phát tán âm thanh" },
        { label: "Ngọn lửa bốc cháy từ lời nói", desc: "Tia lửa và lưỡi gươm bay ra từ khóe môi" },
        { label: "Khói bụi tai vạ bao vây", desc: "Đám mây đen tai ương sà xuống quanh đầu" }
      ]
    }
  },
  {
    id: 50,
    phrase: "Khẩu phật tâm xà",
    category: "Thành ngữ",
    hint: "4 từ • Miệng nói lời từ bi nhưng bụng dạ rắn rết",
    explanation: "Ý nghĩa: Lời nói ngoài miệng thì thánh thiện hiền từ như Phật, nhưng trong tâm can lại độc ác, thâm sâu hiểm hiểm như loài rắn độc. Cảnh báo những kẻ đạo đức giả xảo quyệt.",
    visual: {
      type: "buddha_mouth_snake_heart",
      elements: [
        { label: "Đóa hoa sen từ bi", desc: "Đóa sen hồng tỏa ngát trước miệng thơm ngát" },
        { label: "Lồng ngực mở hé", desc: "Khoang tim bên trong sắc màu u tối" },
        { label: "Con rắn lục mắt đỏ", desc: "Rắn độc cuộn mình thè lưỡi lam nham" }
      ]
    }
  },
  {
    id: 51,
    phrase: "Nhất cử lưỡng tiện",
    category: "Thành ngữ",
    hint: "4 từ • Một hành động mang lại hai mối lợi cùng lúc",
    explanation: "Ý nghĩa: Một lần cất bước, một lần ra tay mà đạt được cả hai bề thuận lợi; tựa như câu 'một mũi tên trúng hai đích'. Ca ngợi sự tính toán khôn khéo và hiệu quả cao trong công việc.",
    visual: {
      type: "one_arrow_two_targets",
      elements: [
        { label: "Cánh cung kéo căng", desc: "Cây cung giương cong bắn vút mũi tên bạc" },
        { label: "Một mũi tên bay xuyên", desc: "Mũi tên xé gió bay thẳng một đường tắp" },
        { label: "Hai quả táo đỏ trúng phập", desc: "Hai trái táo xâu chuỗi trên cùng một thân tên" }
      ]
    }
  },
  {
    id: 52,
    phrase: "Nhập gia tuỳ tục",
    category: "Thành ngữ",
    hint: "4 từ • Đến nơi nào phải thích nghi theo lề lối nơi ấy",
    explanation: "Ý nghĩa: Bước chân vào một ngôi nhà, vùng đất mới thì phải tôn trọng và hòa mình theo đúng tập quán, nề nếp sinh hoạt của gia chủ nơi đó. Tinh thần thích nghi và văn minh trong giao tiếp ứng xử.",
    visual: {
      type: "enter_house_follow_custom",
      elements: [
        { label: "Cổng nhà cổ kính", desc: "Mái ngói hiên nhà truyền thống rộng mở đón khách" },
        { label: "Đôi guốc cởi ngay ngắn", desc: "Đôi hài xếp gọn gàng ngoài bậc thềm thềm đá" },
        { label: "Khách chắp tay cúi chào", desc: "Người khách cúi đầu lễ phép theo gia phong" }
      ]
    }
  },
  {
    id: 53,
    phrase: "Khổ tận cam lai",
    category: "Thành ngữ",
    hint: "4 từ • Vượt qua hết cay đắng sẽ tới ngày ngọt bùi hạnh phúc",
    explanation: "Ý nghĩa: Khổ là đắng ngắt, cam là ngọt lành. Khi nuốt cạn chén thuốc đắng nghét của chuỗi ngày gian truân thì hương vị ngọt ngào của thành quả và bình an sẽ đến ngập tràn. Niềm tin vào tương lai tươi sáng.",
    visual: {
      type: "bitter_end_sweet_arrive",
      elements: [
        { label: "Bát thuốc đắng cạn đáy", desc: "Bát thuốc đen sẫm màu đắng vừa uống sạch" },
        { label: "Cành cam vàng óng trĩu quả", desc: "Cành quả cam chín mọng ngọt ngào vươn tới" },
        { label: "Ánh mặt trời hừng đông", desc: "Tia nắng ấm ban mai xua tan mây mù tăm tối" }
      ]
    }
  },
  {
    id: 54,
    phrase: "Tẩm ngẩm tầm ngầm mà đấm chết voi",
    category: "Tục ngữ",
    hint: "8 từ • Vẻ ngoài lầm lì ít nói nhưng hành động bất ngờ phi thường",
    explanation: "Ý nghĩa: Người có dáng vẻ trầm mặc, ít nói năng, không khoe mẽ nhưng bên trong lại tiềm ẩn sức mạnh ghê gớm, khi ra tay có thể tạo nên kỳ tích hoặc hạ gục đối thủ khổng lồ.",
    visual: {
      type: "quiet_man_knockout_elephant",
      elements: [
        { label: "Người bé nhỏ lặng lẽ", desc: "Chàng trai vóc dáng mảnh khảnh vẻ mặt trầm ngâm" },
        { label: "Nắm đấm phóng ra luồng kình lực", desc: "Nắm đấm sấm sét phát sáng rực rỡ" },
        { label: "Con voi khổng lồ ngã ngửa", desc: "Chú voi to lớn bốn chân chổng vó choáng váng" }
      ]
    }
  },
  {
    id: 55,
    phrase: "Đồng cam cộng khổ",
    category: "Thành ngữ",
    hint: "4 từ • Cùng chia sẻ ngọt bùi và chung vai gánh vác hoạn nạn",
    explanation: "Ý nghĩa: Cùng ăn quả cam ngọt ('đồng cam'), cùng chia sẻ gánh nặng gian truân ('cộng khổ'). Biểu tượng cao đẹp của tình nghĩa anh em, đồng chí bền chặt son sắt qua mọi giông bão cuộc đời.",
    visual: {
      type: "share_sweet_endure_bitter",
      elements: [
        { label: "Quả cam ngọt bẻ đôi", desc: "Hai nửa quả cam vàng mọng chia đều hai tay" },
        { label: "Đòn gánh chung trên vai", desc: "Đôi vai bạn bè cùng ghé gánh quang gánh nặng" },
        { label: "Nụ cười gắn kết", desc: "Ánh mắt tương trợ chân thành sát cánh" }
      ]
    }
  },
  {
    id: 56,
    phrase: "Bách phát bách trúng",
    category: "Thành ngữ",
    hint: "4 từ • Bắn trăm phát trúng cả trăm, mưu tính việc gì cũng thắng",
    explanation: "Ý nghĩa: Xuất phát từ tích Dưỡng Do Cơ thời Chiến Quốc bắn trăm phát tên xuyên lá liễu cách trăm bước không trượt phát nào. Ca ngợi tài năng thiện xạ xuất chúng hoặc kế sách hoàn hảo không chút sai sót.",
    visual: {
      type: "hundred_arrows_bullseye",
      elements: [
        { label: "Bia ngắm hồng tâm đỏ", desc: "Bia bắn tròn với tâm đỏ chót rực sáng" },
        { label: "Bó tên găm chật ních hồng tâm", desc: "Hàng chục mũi tên cắm phập chính giữa điểm 10" },
        { label: "Số 100 vàng rực rỡ", desc: "Con số 100 phát sáng hào quang chiến thắng" }
      ]
    }
  },
  {
    id: 57,
    phrase: "Thuận buồm xuôi gió",
    category: "Thành ngữ",
    hint: "4 từ • Mọi việc trôi chảy, hanh thông gặp nhiều may mắn",
    explanation: "Ý nghĩa: Con thuyền ra khơi gặp cánh buồm no gió thổi xuôi theo dòng nước, đưa thuyền lướt băng băng về bến bờ bình an. Lời chúc tụng tốt lành nhất cho người bắt đầu hành trình hoặc công việc mới.",
    visual: {
      type: "smooth_sailing_wind",
      elements: [
        { label: "Thuyền buồm căng gió", desc: "Cánh buồm trắng no gió phồng căng kiêu hãnh" },
        { label: "Làn gió thổi xuôi chiều", desc: "Những vệt gió lượn sóng màu ngọc bích đẩy mạn thuyền" },
        { label: "Mặt biển êm ả sóng gợn", desc: "Sóng biếc vỗ êm đềm rẽ lối cho thuyền đi" }
      ]
    }
  },
  {
    id: 58,
    phrase: "Mã đáo thành công",
    category: "Thành ngữ",
    hint: "4 từ • Ngựa quay về báo tin thắng trận vẻ vang",
    explanation: "Ý nghĩa: Ngày xưa tướng lĩnh ra trận, chiến mã phi về báo tin đầu tiên là báo hiệu đã đánh thắng trận trở về. Lời chúc làm ăn kinh doanh phát đạt, mưu sự ắt thành đại nghiệp rực rỡ.",
    visual: {
      type: "horse_arrives_success",
      elements: [
        { label: "Tuấn mã dũng mãnh tung vó", desc: "Ngựa ô cơ bắp cuồn cuộn phi nước đại dũng mãnh" },
        { label: "Lá cờ lệnh thêu chữ Thắng", desc: "Cờ đỏ sao vàng tung bay phấp phới sau lưng" },
        { label: "Bụi cát cuộn hào quang", desc: "Đất trời bừng sáng chào đón đoàn quân thắng trận" }
      ]
    }
  },
  {
    id: 59,
    phrase: "Giấy rách phải giữ lấy lề",
    category: "Tục ngữ",
    hint: "6 từ • Dù nghèo khó hoạn nạn vẫn phải giữ nhân phẩm, khí tiết",
    explanation: "Ý nghĩa: Cuốn sách cổ dù qua năm tháng bị rách nát mép trang thì phần gáy lề khâu chỉ vẫn phải được giữ gìn ngay ngắn. Dạy con người dù hoàn cảnh nghèo khó, cơ cực cũng phải giữ gìn đạo đức, thanh danh.",
    visual: {
      type: "torn_paper_keep_margin",
      elements: [
        { label: "Trang sách rách sờn mép", desc: "Trang giấy cổ ố vàng bị rách góc tả tơi" },
        { label: "Lề sách khâu chỉ thẳng tắp", desc: "Đường chỉ đỏ khâu lề ngay ngắn vững chãi" },
        { label: "Nét chữ son lấp lánh", desc: "Dòng chữ nhân nghĩa sáng ngời nơi mép lề" }
      ]
    }
  },
  {
    id: 60,
    phrase: "Giậu đổ bìm leo",
    category: "Thành ngữ",
    hint: "4 từ • Thấy người khác thất thế bèn hùa nhau lấn lướt, vùi dập",
    explanation: "Ý nghĩa: Hàng rào giậu tre vừa xiêu ngã là đám dây leo bìm bìm lập tức bò trườn tới bao phủ, đè bẹp xuống bùn đất. Lên án hành vi tiểu nhân chuyên thừa cơ người khác sa cơ lỡ vận để ức hiếp.",
    visual: {
      type: "fallen_fence_morning_glory",
      elements: [
        { label: "Hàng giậu tre xiêu đổ", desc: "Cọc tre đan mắt cáo gãy nghiêng xuống đất" },
        { label: "Đám dây leo bìm bìm tím", desc: "Dây leo ngoằn ngoèo nở hoa tím bò trùm lên giậu" },
        { label: "Sức nặng đè ép", desc: "Dây leo quấn nghẹt kéo gãy sụp hoàn toàn" }
      ]
    }
  },
  {
    id: 61,
    phrase: "Trứng khôn hơn vịt",
    category: "Thành ngữ",
    hint: "4 từ • Kẻ trẻ tuổi non nớt thích lên mặt dạy bảo người lớn",
    explanation: "Ý nghĩa: Quả trứng do con vịt đẻ ra nhưng lại đòi khôn ngoan hơn cả con vịt mẹ từng trải. Châm biếm những người ít tuổi, thiếu kinh nghiệm thực tế nhưng lại tự mãn, lên mặt dạy đời người lớn.",
    visual: {
      type: "egg_wiser_than_duck",
      elements: [
        { label: "Quả trứng đội mũ tiến sĩ", desc: "Quả trứng nhỏ đeo kính cận cầm phấn trên bục" },
        { label: "Vịt mẹ to lớn kinh ngạc", desc: "Con vịt mẹ vỗ cánh trố mắt nhìn trứng nói" },
        { label: "Bảng đen bài học", desc: "Trứng vẽ sơ đồ lên mặt dạy bảo mẹ vịt" }
      ]
    }
  },
  {
    id: 62,
    phrase: "Thêu dệt chuyện hoang đường",
    category: "Thành ngữ",
    hint: "5 từ • Bịa đặt thêm bớt những chuyện không có thực",
    explanation: "Ý nghĩa: Tựa như người cầm kim chỉ thêu vẽ nên những hình thù kỳ quái trên gấm lụa; chỉ hành vi thêu dệt, bịa đặt tam sao thất bản những câu chuyện hoang đường để lừa dối người nghe.",
    visual: {
      type: "weave_mythical_tales",
      elements: [
        { label: "Cây kim thêu chỉ vàng", desc: "Mũi kim luồn sợi chỉ phát sáng lung linh" },
        { label: "Tấm gấm dệt hình quái vật", desc: "Con rồng bay có cánh kỳ dị hiện trên khung cửi" },
        { label: "Bóng mây huyễn hoặc", desc: "Mây khói hư ảo vần vũ quanh tấm lụa dệt" }
      ]
    }
  }
];

// Helper to remove Vietnamese tones for relaxed matching
function removeVietnameseTones(str) {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  // Some system encodings
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
  str = str.replace(/\u02C6|\u0306|\u031B/g, "");
  return str.trim().toLowerCase();
}

// Generate SVG illustrations for each item
function generateSvgForQuestion(q) {
  const p = q.phrase;
  const v = q.visual;
  
  // Vibrant, stylish SVG with dark-mode blue-black backdrop, lime highlights, and high-contrast vector art
  return `
    <svg viewBox="0 0 600 380" xmlns="http://www.w3.org/2000/svg" class="dhbc-svg-art">
      <defs>
        <linearGradient id="bgGrad_${q.id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b1622" />
          <stop offset="100%" stop-color="#142638" />
        </linearGradient>
        <radialGradient id="glow_${q.id}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#c5f467" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#c5f467" stop-opacity="0" />
        </radialGradient>
        <filter id="shadow_${q.id}">
          <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.5" />
        </filter>
      </defs>

      <!-- Background Box -->
      <rect width="600" height="380" rx="16" fill="url(#bgGrad_${q.id})" stroke="#22394d" stroke-width="2" />
      <circle cx="300" cy="180" r="160" fill="url(#glow_${q.id})" />

      <!-- Vector Metaphor Badge -->
      <rect x="25" y="20" width="140" height="30" rx="6" fill="#1b2e40" stroke="#3a5268" />
      <text x="95" y="40" fill="#a6b5c6" font-family="'Segoe UI', Arial" font-size="13" font-weight="bold" text-anchor="middle">HÌNH ẢNH GỢI Ý</text>

      <rect x="435" y="20" width="140" height="30" rx="6" fill="#1b2e40" stroke="#c5f467" stroke-width="1.2" />
      <text x="505" y="40" fill="#c5f467" font-family="'Segoe UI', Arial" font-size="13" font-weight="bold" text-anchor="middle">${q.words.length} TỪ</text>

      <!-- Illustration Core Scene -->
      <g filter="url(#shadow_${q.id})">
        ${renderSpecificScene(q)}
      </g>

      <!-- Visual Clue Pills -->
      <g transform="translate(30, 320)">
        <rect width="540" height="42" rx="10" fill="#0c1724" stroke="#253c52" />
        <text x="270" y="26" fill="#d9e6f2" font-family="'Segoe UI', Arial" font-size="14" font-weight="600" text-anchor="middle">
          💡 ${v.elements.map(e => e.label).join('  ➜  ')}
        </text>
      </g>
    </svg>
  `.trim();
}

function renderSpecificScene(q) {
  switch(q.id) {
    case 1: // Ếch ngồi đáy giếng
      return `
        <ellipse cx="300" cy="85" rx="90" ry="22" fill="#29445c" stroke="#c5f467" stroke-width="4" />
        <ellipse cx="300" cy="85" rx="70" ry="16" fill="#38bdf8" />
        <path d="M 210 85 L 170 270 L 430 270 L 390 85 Z" fill="#152637" stroke="#3a5268" stroke-width="3" />
        <ellipse cx="300" cy="270" rx="130" ry="22" fill="#0e1b27" />
        <circle cx="300" cy="235" r="38" fill="#22c55e" stroke="#15803d" stroke-width="3" />
        <circle cx="282" cy="205" r="14" fill="#22c55e" stroke="#15803d" stroke-width="2" />
        <circle cx="318" cy="205" r="14" fill="#22c55e" stroke="#15803d" stroke-width="2" />
        <circle cx="282" cy="205" r="7" fill="#fff" /><circle cx="318" cy="205" r="7" fill="#fff" />
        <circle cx="282" cy="201" r="3.5" fill="#000" /><circle cx="318" cy="201" r="3.5" fill="#000" />
        <path d="M 285 242 Q 300 252 315 242" stroke="#14532d" stroke-width="3" fill="none" />
        <path d="M 300 185 L 300 130" stroke="#ffd084" stroke-width="3" stroke-dasharray="6,4" />
        <polygon points="295,130 305,130 300,118" fill="#ffd084" />
      `;
    case 2: // Nước đổ đầu vịt
      return `
        <ellipse cx="280" cy="230" rx="65" ry="45" fill="#facc15" stroke="#ca8a04" stroke-width="3" />
        <circle cx="330" cy="180" r="35" fill="#facc15" stroke="#ca8a04" stroke-width="3" />
        <circle cx="340" cy="172" r="6" fill="#000" /><circle cx="342" cy="170" r="2" fill="#fff" />
        <path d="M 360 178 L 410 188 L 360 198 Z" fill="#f97316" stroke="#c2410c" stroke-width="2" />
        <path d="M 280 80 L 360 80 L 345 125 L 295 125 Z" fill="#64748b" stroke="#94a3b8" stroke-width="3" transform="rotate(25, 320, 100)" />
        <path d="M 345 105 Q 350 150 335 170" stroke="#38bdf8" stroke-width="12" fill="none" stroke-linecap="round" />
        <circle cx="370" cy="165" r="5" fill="#38bdf8" /><circle cx="385" cy="178" r="6" fill="#38bdf8" />
        <circle cx="365" cy="210" r="7" fill="#38bdf8" /><circle cx="310" cy="155" r="5" fill="#38bdf8" />
        <path d="M 320 160 Q 338 175 315 200" stroke="#c5f467" stroke-width="4" fill="none" stroke-linecap="round" />
      `;
    case 3: // Đàn gảy tai trâu
      return `
        <ellipse cx="370" cy="210" rx="85" ry="60" fill="#334155" stroke="#1e293b" stroke-width="3" />
        <circle cx="410" cy="160" r="45" fill="#334155" stroke="#1e293b" stroke-width="3" />
        <ellipse cx="400" cy="125" rx="18" ry="32" fill="#475569" stroke="#1e293b" stroke-width="3" transform="rotate(-20, 400, 125)" />
        <path d="M 430 145 Q 490 100 440 85" stroke="#cbd5e1" stroke-width="8" fill="none" stroke-linecap="round" />
        <circle cx="430" cy="155" r="5" fill="#000" />
        <path d="M 445 175 L 490 195 M 445 180 L 485 185 M 445 185 L 495 175" stroke="#22c55e" stroke-width="4" stroke-linecap="round" />
        <ellipse cx="190" cy="220" rx="38" ry="55" fill="#b45309" stroke="#78350f" stroke-width="4" />
        <rect x="183" y="100" width="14" height="80" rx="4" fill="#d97706" stroke="#78350f" stroke-width="3" />
        <circle cx="190" cy="95" r="14" fill="#b45309" />
        <path d="M 190 100 L 190 260" stroke="#fef08a" stroke-width="2" />
        <text x="245" y="160" fill="#c5f467" font-size="28">🎵</text>
        <text x="295" y="130" fill="#ffd084" font-size="28">🎶</text>
        <path d="M 320 135 L 380 125" stroke="#c5f467" stroke-width="3" stroke-dasharray="4,4" />
      `;
    case 4: // Môi hở răng lạnh
      return `
        <path d="M 180 170 Q 300 110 420 170 Q 300 150 180 170 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="3" />
        <path d="M 180 190 Q 300 210 420 190 Q 300 270 180 190 Z" fill="#dc2626" stroke="#991b1b" stroke-width="3" />
        <rect x="230" y="160" width="140" height="42" rx="4" fill="#0f172a" />
        <rect x="240" y="163" width="22" height="18" rx="3" fill="#f8fafc" stroke="#cbd5e1" />
        <rect x="265" y="163" width="22" height="18" rx="3" fill="#f8fafc" stroke="#cbd5e1" />
        <rect x="290" y="163" width="22" height="18" rx="3" fill="#f8fafc" stroke="#cbd5e1" />
        <rect x="315" y="163" width="22" height="18" rx="3" fill="#f8fafc" stroke="#cbd5e1" />
        <rect x="340" y="163" width="22" height="18" rx="3" fill="#f8fafc" stroke="#cbd5e1" />
        <text x="235" y="145" fill="#38bdf8" font-size="34">❄</text>
        <text x="350" y="235" fill="#38bdf8" font-size="30">❄</text>
        <path d="M 140 180 Q 200 170 230 180" stroke="#38bdf8" stroke-width="4" stroke-dasharray="6,4" />
      `;
    case 5: // Cõng rắn cắn gà nhà
      return `
        <rect x="380" y="120" width="160" height="140" rx="8" fill="#1e293b" stroke="#475569" stroke-width="3" />
        <polygon points="370,120 460,70 550,120" fill="#b45309" stroke="#78350f" stroke-width="3" />
        <text x="460" y="145" fill="#ffd084" font-size="14" font-weight="bold" text-anchor="middle">NHÀ</text>
        <circle cx="460" cy="200" r="24" fill="#f59e0b" stroke="#d97706" stroke-width="2" />
        <text x="448" y="208" font-size="24">🐔</text>
        <circle cx="210" cy="150" r="22" fill="#cbd5e1" />
        <path d="M 210 172 L 210 240 L 180 280 M 210 240 L 235 280" stroke="#cbd5e1" stroke-width="6" stroke-linecap="round" />
        <path d="M 160 210 Q 200 170 240 180 Q 320 160 380 180 Q 420 190 450 195" stroke="#22c55e" stroke-width="12" fill="none" stroke-linecap="round" />
        <polygon points="448,188 465,195 448,202" fill="#15803d" />
      `;
    case 6: // Vỏ quýt dày có móng tay nhọn
      return `
        <circle cx="240" cy="190" r="90" fill="#f97316" stroke="#c2410c" stroke-width="4" />
        <circle cx="240" cy="190" r="70" fill="#fdba74" stroke="#ea580c" stroke-width="14" />
        <circle cx="240" cy="190" r="56" fill="#ffedd5" />
        <path d="M 240 190 L 275 160 M 240 190 L 275 220 M 240 190 L 220 230" stroke="#f97316" stroke-width="3" />
        <path d="M 460 140 L 350 170 L 320 175" stroke="#cbd5e1" stroke-width="18" stroke-linecap="round" />
        <polygon points="325,160 275,175 325,188" fill="#c5f467" stroke="#84cc16" stroke-width="2" />
      `;
    case 7: // Cá chép hoá rồng
      return `
        <rect x="180" y="160" width="240" height="120" rx="8" fill="#0284c7" stroke="#38bdf8" stroke-width="3" opacity="0.6" />
        <path d="M 190 200 Q 240 220 300 200 Q 360 180 410 200" stroke="#bae6fd" stroke-width="5" fill="none" />
        <ellipse cx="230" cy="170" rx="45" ry="25" fill="#f97316" stroke="#c2410c" stroke-width="3" transform="rotate(-30, 230, 170)" />
        <polygon points="175,190 150,170 150,210" fill="#ea580c" />
        <path d="M 270 150 Q 330 110 390 120" stroke="#eab308" stroke-width="22" fill="none" stroke-linecap="round" />
        <polygon points="390,105 430,120 390,135" fill="#ca8a04" />
        <path d="M 405 105 Q 415 80 435 75" stroke="#c5f467" stroke-width="5" fill="none" />
        <circle cx="460" cy="120" r="14" fill="#ffd084" stroke="#f59e0b" stroke-width="3" />
      `;
    case 8: // Lá lành đùm lá rách
      return `
        <path d="M 150 200 C 150 110 300 90 440 180 C 420 280 260 290 150 200 Z" fill="#22c55e" stroke="#15803d" stroke-width="4" />
        <path d="M 150 200 Q 290 180 440 180" stroke="#166534" stroke-width="3" fill="none" />
        <path d="M 220 200 C 230 160 310 150 370 190 C 350 230 280 230 220 200 Z" fill="#eab308" stroke="#a16207" stroke-width="2" />
        <polygon points="280,165 295,185 285,185" fill="#22c55e" />
        <rect x="290" y="125" width="16" height="140" rx="4" fill="#ffd084" stroke="#d97706" stroke-width="2" opacity="0.8" />
      `;
    case 9: // Đục nước béo cò
      return `
        <rect x="120" y="180" width="360" height="110" rx="10" fill="#78350f" stroke="#92400e" stroke-width="3" opacity="0.85" />
        <ellipse cx="220" cy="205" rx="18" ry="9" fill="#94a3b8" />
        <ellipse cx="370" cy="150" rx="42" ry="32" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3" />
        <polygon points="425,95 495,115 425,108" fill="#f59e0b" stroke="#d97706" stroke-width="2" />
        <circle cx="360" cy="165" r="24" fill="#e2e8f0" />
        <line x1="360" y1="180" x2="360" y2="250" stroke="#f59e0b" stroke-width="4" />
      `;
    case 10: // Gắp lửa bỏ tay người
      return `
        <line x1="160" y1="110" x2="280" y2="180" stroke="#b45309" stroke-width="6" stroke-linecap="round" />
        <line x1="160" y1="130" x2="280" y2="195" stroke="#b45309" stroke-width="6" stroke-linecap="round" />
        <circle cx="295" cy="188" r="22" fill="#dc2626" stroke="#b91c1c" stroke-width="3" />
        <path d="M 440 250 L 370 230 L 330 220 L 320 195" stroke="#cbd5e1" stroke-width="14" stroke-linecap="round" />
        <text x="360" y="160" fill="#ef4444" font-size="28">🔥</text>
      `;
    case 11: // Bút sa gà chết
      return `
        <!-- Cây bút máy sa xuống -->
        <path d="M 190 70 L 230 190 L 210 215 L 180 180 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="3" />
        <polygon points="210,215 200,245 220,225" fill="#facc15" stroke="#b45309" />
        <circle cx="200" cy="250" r="12" fill="#000" />
        <!-- Tờ giấy có chữ ký -->
        <rect x="150" y="240" width="130" height="40" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" />
        <path d="M 165 260 Q 185 245 210 260 T 260 260" stroke="#000" stroke-width="2" fill="none" />
        <!-- Con gà lăn đùng ngã ngửa -->
        <ellipse cx="400" cy="230" rx="55" ry="35" fill="#f97316" stroke="#c2410c" stroke-width="3" />
        <circle cx="350" cy="225" r="24" fill="#f97316" />
        <text x="342" y="232" font-size="20">✖‿✖</text>
        <line x1="410" y1="210" x2="410" y2="160" stroke="#f59e0b" stroke-width="4" />
        <line x1="390" y1="210" x2="390" y2="160" stroke="#f59e0b" stroke-width="4" />
      `;
    case 12: // Tre già măng mọc
      return `
        <!-- Thân tre già cong che chở -->
        <path d="M 220 280 C 220 180 240 100 290 70" stroke="#15803d" stroke-width="24" fill="none" stroke-linecap="round" />
        <line x1="208" y1="220" x2="232" y2="220" stroke="#052e16" stroke-width="3" />
        <line x1="218" y1="160" x2="242" y2="160" stroke="#052e16" stroke-width="3" />
        <line x1="238" y1="110" x2="262" y2="110" stroke="#052e16" stroke-width="3" />
        <!-- Búp măng non nhọn hoắt nhú lên -->
        <polygon points="360,280 430,280 395,150" fill="#84cc16" stroke="#4d7c0f" stroke-width="3" />
        <polygon points="370,250 420,250 395,170" fill="#a3e635" />
        <polygon points="380,210 410,210 395,180" fill="#c5f467" />
        <text x="395" y="130" fill="#c5f467" font-size="24" text-anchor="middle">🌱</text>
      `;
    case 13: // Khắc cốt ghi tâm
      return `
        <!-- Khúc xương trắng -->
        <path d="M 180 180 L 420 180" stroke="#e2e8f0" stroke-width="26" stroke-linecap="round" />
        <circle cx="180" cy="165" r="16" fill="#e2e8f0" /><circle cx="180" cy="195" r="16" fill="#e2e8f0" />
        <circle cx="420" cy="165" r="16" fill="#e2e8f0" /><circle cx="420" cy="195" r="16" fill="#e2e8f0" />
        <!-- Trái tim đỏ ở giữa -->
        <path d="M 300 220 C 230 160 250 110 300 145 C 350 110 370 160 300 220 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="3" />
        <!-- Mũi dao khắc chữ ƠN sáng rực -->
        <polygon points="300,165 330,120 315,115" fill="#facc15" stroke="#ca8a04" stroke-width="2" />
        <text x="300" y="180" fill="#ffffff" font-family="'Segoe UI', Arial" font-size="20" font-weight="900" text-anchor="middle">ƠN</text>
      `;
    case 14: // Cờ bạc là bác thằng bần
      return `
        <!-- Cặp xúc xắc đỏ đen -->
        <rect x="180" y="120" width="60" height="60" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3" />
        <circle cx="210" cy="150" r="8" fill="#ef4444" />
        <rect x="230" y="150" width="60" height="60" rx="8" fill="#ef4444" stroke="#b91c1c" stroke-width="3" />
        <circle cx="245" cy="165" r="5" fill="#fff" /><circle cx="275" cy="195" r="5" fill="#fff" />
        <!-- Mũi tên chỉ lối đến bần hàn -->
        <path d="M 310 170 L 370 170" stroke="#ffd084" stroke-width="6" stroke-linecap="round" />
        <polygon points="370,160 395,170 370,180" fill="#ffd084" />
        <!-- Anh chàng ăn mày rách rưới cầm gậy -->
        <circle cx="440" cy="140" r="20" fill="#cbd5e1" />
        <path d="M 440 160 L 440 230 L 420 270 M 440 230 L 460 270" stroke="#94a3b8" stroke-width="6" stroke-linecap="round" />
        <line x1="465" y1="180" x2="475" y2="270" stroke="#b45309" stroke-width="4" />
        <text x="410" y="220" font-size="24">🏚️</text>
      `;
    case 15: // Ngưu tầm ngưu mã tầm mã
      return `
        <!-- Bên trái: 2 chú trâu bên nhau -->
        <g transform="translate(140, 140)">
          <ellipse cx="40" cy="50" rx="35" ry="25" fill="#475569" />
          <ellipse cx="85" cy="50" rx="35" ry="25" fill="#334155" />
          <text x="60" y="55" font-size="32" text-anchor="middle">🐂🐂</text>
          <text x="60" y="95" fill="#ffd084" font-weight="bold" font-size="14" text-anchor="middle">NGƯU TẦM NGƯU</text>
        </g>
        <!-- Bên phải: 2 chú ngựa sát cánh -->
        <g transform="translate(340, 140)">
          <ellipse cx="40" cy="50" rx="35" ry="25" fill="#b45309" />
          <ellipse cx="85" cy="50" rx="35" ry="25" fill="#92400e" />
          <text x="60" y="55" font-size="32" text-anchor="middle">🐎🐎</text>
          <text x="60" y="95" fill="#c5f467" font-weight="bold" font-size="14" text-anchor="middle">MÃ TẦM MÃ</text>
        </g>
      `;
    case 16: // Há miệng chờ sung
      return `
        <!-- Người nằm ngửa há mồm -->
        <path d="M 180 260 L 260 260 L 320 230" stroke="#cbd5e1" stroke-width="12" stroke-linecap="round" />
        <circle cx="340" cy="220" r="26" fill="#fed7aa" />
        <!-- Miệng mở tròn xoe -->
        <ellipse cx="340" cy="205" rx="14" ry="12" fill="#991b1b" stroke="#7f1d1d" stroke-width="2" />
        <!-- Cành sung trĩu quả phía trên -->
        <path d="M 240 70 Q 330 90 440 60" stroke="#78350f" stroke-width="10" stroke-linecap="round" />
        <circle cx="330" cy="100" r="16" fill="#a855f7" stroke="#7e22ce" stroke-width="2" />
        <circle cx="360" cy="105" r="16" fill="#9333ea" stroke="#7e22ce" stroke-width="2" />
        <!-- Quả sung đang rụng rơi thẳng mồm -->
        <circle cx="340" cy="155" r="14" fill="#a855f7" stroke="#ffd084" stroke-width="3" />
        <line x1="340" y1="120" x2="340" y2="140" stroke="#ffd084" stroke-width="2" stroke-dasharray="3,3" />
      `;
    case 17: // Mèo mù vớ cá rán
      return `
        <!-- Mèo đeo kính râm đen -->
        <ellipse cx="230" cy="200" rx="55" ry="45" fill="#fb923c" stroke="#c2410c" stroke-width="3" />
        <polygon points="190,165 210,130 225,165" fill="#ea580c" />
        <polygon points="235,165 250,130 270,165" fill="#ea580c" />
        <!-- Cặp kính râm đen thui -->
        <rect x="200" y="185" width="26" height="18" rx="4" fill="#000" stroke="#38bdf8" stroke-width="2" />
        <rect x="235" y="185" width="26" height="18" rx="4" fill="#000" stroke="#38bdf8" stroke-width="2" />
        <line x1="226" y1="194" x2="235" y2="194" stroke="#38bdf8" stroke-width="2" />
        <!-- Đĩa cá rán vàng giòn bốc khói thơm -->
        <ellipse cx="390" cy="230" rx="75" ry="24" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3" />
        <ellipse cx="390" cy="225" rx="50" ry="18" fill="#eab308" stroke="#ca8a04" stroke-width="3" />
        <polygon points="440,225 465,215 465,235" fill="#eab308" />
        <path d="M 370 200 Q 380 170 370 150 M 400 200 Q 410 170 400 150" stroke="#ffd084" stroke-width="3" fill="none" />
      `;
    case 18: // Nuôi ong tay áo
      return `
        <!-- Ống tay áo lụa rộng -->
        <path d="M 180 120 L 320 140 L 290 270 L 150 250 Z" fill="#b91c1c" stroke="#7f1d1d" stroke-width="4" />
        <ellipse cx="220" cy="260" rx="70" ry="22" fill="#7f1d1d" />
        <!-- Tổ ong ẩn bên trong nếp áo -->
        <circle cx="210" cy="200" r="32" fill="#f59e0b" stroke="#b45309" stroke-width="3" />
        <!-- Bầy ong vàng đen bay túa ra từ cổ tay -->
        <text x="240" y="275" font-size="28">🐝</text>
        <text x="310" y="250" font-size="28">🐝</text>
        <text x="360" y="280" font-size="34">🐝</text>
        <path d="M 370 260 L 410 240" stroke="#ef4444" stroke-width="3" stroke-dasharray="3,3" />
        <text x="420" y="240" fill="#ef4444" font-size="20">⚡</text>
      `;
    case 19: // Ném đá giấu tay
      return `
        <!-- Hòn đá vút bay bên phải -->
        <circle cx="430" cy="140" r="28" fill="#64748b" stroke="#334155" stroke-width="3" />
        <path d="M 330 180 Q 380 150 400 140" stroke="#38bdf8" stroke-width="4" stroke-dasharray="5,4" />
        <!-- Bàn tay giấu tịt sau lưng -->
        <circle cx="230" cy="140" r="26" fill="#cbd5e1" />
        <path d="M 230 166 L 230 250 L 200 285" stroke="#cbd5e1" stroke-width="8" stroke-linecap="round" />
        <path d="M 230 190 Q 200 210 180 230" stroke="#cbd5e1" stroke-width="8" stroke-linecap="round" />
        <!-- Bàn tay quặt sau lưng -->
        <rect x="160" y="215" width="28" height="24" rx="6" fill="#cbd5e1" stroke="#94a3b8" />
        <text x="270" y="145" font-size="26">😇❓</text>
      `;
    case 20: // Thùng rỗng kêu to
      return `
        <!-- Chiếc thùng phuy gỗ rỗng ruột mở nắp -->
        <ellipse cx="240" cy="130" rx="65" ry="24" fill="#0f172a" stroke="#b45309" stroke-width="4" />
        <path d="M 175 130 L 175 250 A 65 24 0 0 0 305 250 L 305 130 Z" fill="#b45309" stroke="#78350f" stroke-width="3" />
        <line x1="175" y1="180" x2="305" y2="180" stroke="#000" stroke-width="4" />
        <!-- Rỗng tuếch bên trong -->
        <text x="240" y="170" fill="#a6b5c6" font-size="12" font-weight="bold" text-anchor="middle">RỖNG KHÔNG</text>
        <!-- Sóng âm thanh cực lớn bùng nổ -->
        <path d="M 330 150 Q 380 180 330 210" stroke="#c5f467" stroke-width="6" fill="none" />
        <path d="M 355 130 Q 425 180 355 230" stroke="#c5f467" stroke-width="8" fill="none" />
        <path d="M 380 110 Q 470 180 380 250" stroke="#ffd084" stroke-width="10" fill="none" />
        <text x="440" y="185" fill="#ffd084" font-weight="900" font-size="22">BOONG!</text>
      `;
    case 21: // Đao to búa lớn
      return `
        <!-- Cây đại đao sáng loáng bắt chéo -->
        <path d="M 170 270 L 390 100 L 420 80 L 390 130 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="4" />
        <line x1="140" y1="290" x2="200" y2="240" stroke="#b45309" stroke-width="12" stroke-linecap="round" />
        <!-- Cây búa tạ sấm sét tày đình -->
        <line x1="420" y1="280" x2="210" y2="100" stroke="#78350f" stroke-width="12" stroke-linecap="round" />
        <rect x="180" y="70" width="75" height="50" rx="8" fill="#64748b" stroke="#334155" stroke-width="4" transform="rotate(-35, 215, 95)" />
        <text x="300" y="190" fill="#ffd084" font-size="34">⚡</text>
      `;
    case 22: // Uống nước nhớ nguồn
      return `
        <!-- Người cúi uống nước bên bờ suối -->
        <ellipse cx="200" cy="240" rx="30" ry="18" fill="#cbd5e1" />
        <path d="M 220 235 L 240 245" stroke="#f59e0b" stroke-width="4" />
        <!-- Dòng suối uốn lượn -->
        <path d="M 230 250 Q 300 230 330 190 Q 360 150 410 130" stroke="#38bdf8" stroke-width="16" fill="none" stroke-linecap="round" />
        <!-- Đỉnh núi cao nguồn cội -->
        <polygon points="350,150 420,70 480,150" fill="#1e293b" stroke="#475569" stroke-width="3" />
        <polygon points="395,100 420,70 445,100" fill="#f8fafc" />
        <text x="420" y="60" fill="#ffd084" font-size="14" font-weight="bold" text-anchor="middle">NGUỒN NƯỚC</text>
      `;
    case 23: // Ăn cháo đá bát
      return `
        <!-- Bát cháo thơm ngon -->
        <ellipse cx="230" cy="180" rx="55" ry="24" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3" />
        <path d="M 175 180 Q 230 250 285 180 Z" fill="#fed7aa" stroke="#cbd5e1" stroke-width="3" />
        <!-- Bàn chân mang giày vung cú đá mạnh -->
        <path d="M 330 230 L 270 210 L 290 180" stroke="#ef4444" stroke-width="16" stroke-linecap="round" />
        <!-- Mảnh bát vỡ tung tóe -->
        <text x="320" y="150" font-size="28">💥</text>
        <polygon points="340,160 360,140 350,170" fill="#f8fafc" stroke="#000" />
      `;
    case 24: // Cháy nhà ra mặt chuột
      return `
        <!-- Mái nhà bốc cháy đỏ rực -->
        <polygon points="200,160 300,90 400,160" fill="#b45309" stroke="#78350f" stroke-width="3" />
        <rect x="230" y="160" width="140" height="90" fill="#1e293b" stroke="#334155" stroke-width="3" />
        <text x="300" y="125" font-size="40">🔥</text>
        <!-- Đàn chuột túa ra lộ mặt -->
        <ellipse cx="390" cy="230" rx="28" ry="16" fill="#64748b" stroke="#334155" stroke-width="2" />
        <ellipse cx="430" cy="245" rx="22" ry="12" fill="#64748b" />
        <text x="380" y="235" font-size="22">🐭</text>
        <text x="420" y="248" font-size="18">🐭</text>
      `;
    case 25: // Tránh vỏ dưa gặp vỏ dừa
      return `
        <!-- Vỏ dưa hấu bên trái -->
        <path d="M 170 220 A 45 45 0 0 1 250 220 Z" fill="#ef4444" stroke="#15803d" stroke-width="6" />
        <!-- Bàn chân nhảy tránh -->
        <path d="M 240 130 L 280 180 L 320 140" stroke="#cbd5e1" stroke-width="12" stroke-linecap="round" />
        <!-- Gáo dừa cứng đón sẵn bên phải -->
        <circle cx="390" cy="220" r="38" fill="#78350f" stroke="#451a03" stroke-width="4" />
        <circle cx="378" cy="212" r="6" fill="#000" /><circle cx="398" cy="212" r="6" fill="#000" />
        <text x="390" y="160" fill="#ef4444" font-size="26">⚠️</text>
      `;
    case 26: // Đi guốc trong bụng
      return `
        <!-- Dạ dày uốn cong -->
        <path d="M 230 100 C 170 120 160 220 230 260 C 330 290 380 200 340 120 Z" fill="#f43f5e" stroke="#be123c" stroke-width="4" opacity="0.4" />
        <!-- Đôi guốc mộc quai đỏ bước bên trong -->
        <rect x="220" y="170" width="60" height="16" rx="4" fill="#d97706" stroke="#b45309" stroke-width="2" />
        <path d="M 235 170 Q 250 150 265 170" stroke="#ef4444" stroke-width="4" fill="none" />
        <rect x="225" y="186" width="10" height="15" fill="#78350f" />
        <rect x="265" y="186" width="10" height="15" fill="#78350f" />
        <text x="290" y="225" fill="#c5f467" font-size="14" font-weight="bold">LỘC CỘC...</text>
      `;
    case 27: // Đầu voi đuôi chuột
      return `
        <!-- Đầu con voi đồ sộ có ngà -->
        <ellipse cx="250" cy="180" rx="75" ry="60" fill="#64748b" stroke="#334155" stroke-width="3" />
        <circle cx="210" cy="165" r="8" fill="#000" />
        <path d="M 190 190 Q 150 240 180 270" stroke="#64748b" stroke-width="18" fill="none" stroke-linecap="round" />
        <path d="M 220 220 Q 200 250 180 240" stroke="#f8fafc" stroke-width="6" fill="none" stroke-linecap="round" />
        <!-- Đuôi chuột teo tóp phía sau -->
        <path d="M 325 180 Q 420 185 450 160 Q 470 140 460 200" stroke="#f43f5e" stroke-width="4" fill="none" stroke-linecap="round" />
        <text x="460" y="230" fill="#ffd084" font-size="14" font-weight="bold">ĐUÔI CHUỘT</text>
      `;
    case 28: // Tay làm hàm nhai
      return `
        <!-- Đôi bàn tay gặt lúa -->
        <g transform="translate(160, 160)">
          <path d="M 20 60 L 50 20 L 70 30" stroke="#cbd5e1" stroke-width="10" stroke-linecap="round" />
          <text x="45" y="20" font-size="34">🌾</text>
          <text x="50" y="90" fill="#ffd084" font-weight="bold" font-size="14" text-anchor="middle">TAY LÀM</text>
        </g>
        <!-- Khuôn miệng nhai cơm -->
        <g transform="translate(340, 160)">
          <ellipse cx="50" cy="35" rx="35" ry="20" fill="#ef4444" stroke="#991b1b" stroke-width="3" />
          <rect x="35" y="28" width="12" height="12" rx="2" fill="#fff" />
          <rect x="53" y="28" width="12" height="12" rx="2" fill="#fff" />
          <text x="50" y="90" fill="#c5f467" font-weight="bold" font-size="14" text-anchor="middle">HÀM NHAI</text>
        </g>
      `;
    case 29: // Giấu đầu hở đuôi
      return `
        <!-- Con đà điểu / thú rúc đầu vào bao tải -->
        <rect x="180" y="160" width="80" height="90" rx="8" fill="#78350f" stroke="#451a03" stroke-width="3" />
        <text x="220" y="210" fill="#ffd084" font-weight="bold" font-size="12" text-anchor="middle">BAO TẢI</text>
        <ellipse cx="320" cy="200" rx="60" ry="40" fill="#475569" stroke="#1e293b" stroke-width="3" />
        <!-- Chiếc đuôi to xù lộ ra chỏng chơ -->
        <path d="M 380 190 Q 450 160 480 210" stroke="#f59e0b" stroke-width="18" fill="none" stroke-linecap="round" />
        <polygon points="460,200 485,210 470,225" fill="#d97706" />
        <text x="440" y="140" fill="#ef4444" font-size="28">👀</text>
      `;
    case 30: // Gừng càng già càng cay
      return `
        <!-- Củ gừng già cổ thụ -->
        <path d="M 200 210 Q 230 160 280 170 Q 320 140 370 190 Q 330 250 270 240 Z" fill="#d97706" stroke="#92400e" stroke-width="4" />
        <circle cx="230" cy="200" r="14" fill="#b45309" />
        <!-- Lửa cay xè bốc khói -->
        <text x="270" y="140" font-size="40">🔥</text>
        <text x="330" y="150" font-size="34">🌶️</text>
        <text x="300" y="275" fill="#ffd084" font-weight="bold" font-size="15" text-anchor="middle">CỰC CAY!</text>
      `;
    case 31: // Treo đầu dê bán thịt chó
      return `
        <!-- Đầu dê treo trên bảng -->
        <rect x="170" y="120" width="110" height="110" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="3" />
        <text x="225" y="180" font-size="42" text-anchor="middle">🐐</text>
        <text x="225" y="215" fill="#38bdf8" font-size="12" font-weight="bold" text-anchor="middle">TREO ĐẦU DÊ</text>
        <!-- Bàn bán thịt chó bên cạnh -->
        <rect x="330" y="160" width="130" height="70" rx="4" fill="#b45309" stroke="#78350f" stroke-width="3" />
        <text x="395" y="195" font-size="32" text-anchor="middle">🐕🥩</text>
        <text x="395" y="250" fill="#ef4444" font-size="12" font-weight="bold" text-anchor="middle">BÁN THỊT CHÓ</text>
      `;
    case 32: // Mật ngọt chết ruồi
      return `
        <!-- Hũ mật ong vàng óng -->
        <ellipse cx="250" cy="170" rx="50" ry="20" fill="#facc15" stroke="#ca8a04" stroke-width="3" />
        <path d="M 200 170 Q 200 260 250 260 Q 300 260 300 170 Z" fill="#eab308" stroke="#ca8a04" stroke-width="3" />
        <text x="250" y="225" fill="#78350f" font-weight="900" font-size="16" text-anchor="middle">MẬT ONG</text>
        <!-- Đàn ruồi dính chân chết chìm -->
        <circle cx="370" cy="180" r="16" fill="#1e293b" />
        <text x="355" y="190" font-size="28">🪰</text>
        <text x="400" y="220" font-size="28">🪰</text>
        <text x="430" y="180" fill="#ef4444" font-size="24">💀</text>
      `;
    case 33: // Chó ngáp phải ruồi
      return `
        <!-- Chú chó há to mồm ngáp -->
        <ellipse cx="250" cy="210" rx="60" ry="45" fill="#f59e0b" stroke="#b45309" stroke-width="3" />
        <circle cx="195" cy="190" r="5" fill="#000" />
        <!-- Cái miệng ngáp hết cỡ -->
        <ellipse cx="320" cy="200" rx="35" ry="30" fill="#7f1d1d" stroke="#991b1b" stroke-width="3" />
        <!-- Con ruồi bay tọt vào giữa họng -->
        <text x="305" y="210" font-size="24">🪰</text>
        <path d="M 430 160 Q 370 180 330 200" stroke="#38bdf8" stroke-width="3" stroke-dasharray="4,4" fill="none" />
      `;
    case 34: // Lửa thử vàng gian nan thử sức
      return `
        <!-- Thỏi vàng giữa ngọn lửa -->
        <polygon points="210,210 270,180 330,210 270,240" fill="#ffd084" stroke="#ca8a04" stroke-width="3" />
        <text x="270" y="218" fill="#78350f" font-weight="bold" font-size="12" text-anchor="middle">9999</text>
        <text x="270" y="160" font-size="44" text-anchor="middle">🔥</text>
        <!-- Người leo dốc đá hiểm trở -->
        <polygon points="380,260 440,150 490,260" fill="#334155" stroke="#1e293b" stroke-width="3" />
        <circle cx="420" cy="170" r="12" fill="#cbd5e1" />
        <line x1="420" y1="182" x2="430" y2="210" stroke="#cbd5e1" stroke-width="4" />
      `;
    case 35: // Thừa nước đục thả câu
      return `
        <!-- Vùng nước bùn đục xoáy cuộn -->
        <rect x="150" y="190" width="300" height="80" rx="10" fill="#78350f" stroke="#92400e" stroke-width="3" />
        <!-- Cần câu buông lưỡi -->
        <line x1="170" y1="90" x2="350" y2="120" stroke="#b45309" stroke-width="6" stroke-linecap="round" />
        <line x1="350" y1="120" x2="350" y2="230" stroke="#bae6fd" stroke-width="2" />
        <path d="M 350 230 Q 360 245 350 250" stroke="#cbd5e1" stroke-width="3" fill="none" />
        <!-- Cá to cắn câu giật lên -->
        <ellipse cx="350" cy="245" rx="18" ry="9" fill="#38bdf8" stroke="#0284c7" stroke-width="2" />
      `;
    case 36: // Cá lớn nuốt cá bé
      return `
        <!-- Con cá mập lớn ngoác mồm -->
        <path d="M 170 190 Q 230 110 320 160 L 320 220 Q 230 270 170 190 Z" fill="#0284c7" stroke="#0369a1" stroke-width="4" />
        <!-- Cá nhỡ -->
        <ellipse cx="360" cy="190" rx="30" ry="16" fill="#f59e0b" stroke="#d97706" stroke-width="2" />
        <!-- Đàn cá con tí xíu -->
        <ellipse cx="430" cy="190" rx="12" ry="6" fill="#22c55e" />
        <ellipse cx="460" cy="175" rx="10" ry="5" fill="#22c55e" />
      `;
    case 37: // Tái ông thất mã
      return `
        <!-- Ông lão râu bạc -->
        <circle cx="210" cy="180" r="30" fill="#fed7aa" stroke="#ea580c" stroke-width="2" />
        <path d="M 195 190 Q 210 230 225 190" fill="#f8fafc" />
        <!-- Con ngựa phi đi xa -->
        <text x="350" y="170" font-size="44">🐎</text>
        <path d="M 280 210 Q 340 180 400 210" stroke="#ffd084" stroke-width="4" stroke-dasharray="6,4" fill="none" />
        <text x="420" y="220" font-size="34">🐎🐎</text>
      `;
    case 38: // Rút dây động rừng
      return `
        <!-- Tay kéo sợi dây leo -->
        <path d="M 150 200 L 250 170" stroke="#22c55e" stroke-width="8" stroke-linecap="round" />
        <rect x="130" y="185" width="25" height="30" rx="6" fill="#cbd5e1" />
        <!-- Cả khu rừng rung chuyển chim bay -->
        <text x="360" y="190" font-size="44">🌲🌳</text>
        <text x="430" y="140" font-size="30">🐦🐦</text>
        <path d="M 320 230 L 460 230" stroke="#ef4444" stroke-width="3" stroke-dasharray="4,4" />
      `;
    case 39: // Thọc gậy bánh xe
      return `
        <!-- Bánh xe nan hoa đang quay -->
        <circle cx="270" cy="190" r="65" fill="none" stroke="#64748b" stroke-width="8" />
        <line x1="205" y1="190" x2="335" y2="190" stroke="#64748b" stroke-width="4" />
        <line x1="270" y1="125" x2="270" y2="255" stroke="#64748b" stroke-width="4" />
        <!-- Cây gậy chọc ngang gãy nan hoa -->
        <line x1="420" y1="120" x2="260" y2="190" stroke="#b45309" stroke-width="14" stroke-linecap="round" />
        <text x="240" y="180" font-size="28">💥</text>
      `;
    case 40: // Đẽo cày giữa đường
      return `
        <!-- Khúc gỗ cày bị gọt dở -->
        <path d="M 220 220 Q 280 180 340 230" stroke="#b45309" stroke-width="16" stroke-linecap="round" fill="none" />
        <!-- Rìu đẽo bên cạnh -->
        <rect x="270" y="160" width="30" height="20" rx="2" fill="#64748b" />
        <line x1="285" y1="160" x2="285" y2="120" stroke="#78350f" stroke-width="6" />
        <!-- Mũi tên bàn tán chỉ trỏ bốn phía -->
        <text x="170" y="180" font-size="28">👉</text>
        <text x="370" y="180" font-size="28">👈</text>
      `;
    case 41: // Qua cầu rút ván
      return `
        <!-- Chiếc cầu gỗ bắc qua sông -->
        <rect x="160" y="200" width="120" height="14" fill="#78350f" />
        <!-- Người sang bờ an toàn -->
        <circle cx="430" cy="150" r="18" fill="#cbd5e1" />
        <line x1="430" y1="168" x2="430" y2="210" stroke="#cbd5e1" stroke-width="6" />
        <!-- Tấm ván cầu bị rút ném rơi xuống nước -->
        <rect x="300" y="220" width="80" height="12" fill="#b45309" transform="rotate(35, 340, 225)" />
        <text x="330" y="270" fill="#38bdf8" font-size="18">🌊🌊</text>
      `;
    case 42: // Miệng nam mô bụng một bồ dao găm
      return `
        <!-- Miệng tụng niệm chuỗi hạt -->
        <ellipse cx="230" cy="140" rx="30" ry="14" fill="#ef4444" />
        <text x="230" y="115" fill="#facc15" font-size="20">📿</text>
        <!-- Bồ đầy ắp dao găm trong bụng -->
        <rect x="290" y="160" width="110" height="90" rx="10" fill="#78350f" stroke="#ca8a04" stroke-width="3" />
        <line x1="310" y1="180" x2="310" y2="120" stroke="#94a3b8" stroke-width="4" />
        <polygon points="307,120 313,120 310,105" fill="#e2e8f0" />
        <line x1="345" y1="180" x2="345" y2="115" stroke="#94a3b8" stroke-width="4" />
        <polygon points="342,115 348,115 345,100" fill="#e2e8f0" />
        <line x1="380" y1="180" x2="380" y2="125" stroke="#94a3b8" stroke-width="4" />
      `;
    case 43: // Nước chảy đá mòn
      return `
        <!-- Giọt nước rơi đều đặn -->
        <path d="M 270 90 Q 260 120 270 140 Q 280 120 270 90 Z" fill="#38bdf8" />
        <path d="M 270 150 Q 260 180 270 200 Q 280 180 270 150 Z" fill="#38bdf8" />
        <!-- Tảng đá lớn có vết lõm sâu -->
        <path d="M 180 260 Q 270 210 360 260 Z" fill="#64748b" stroke="#334155" stroke-width="4" />
        <ellipse cx="270" cy="235" rx="28" ry="12" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
        <text x="270" y="285" fill="#c5f467" font-size="13" font-weight="bold" text-anchor="middle">LÕM SÂU HOẮM</text>
      `;
    case 44: // Gieo gió gặt bão
      return `
        <!-- Gió nhẹ vờn tay -->
        <path d="M 180 200 Q 230 180 260 210" stroke="#bae6fd" stroke-width="4" fill="none" />
        <!-- Cơn bão sấm chớp cuồng nộ -->
        <ellipse cx="380" cy="140" rx="75" ry="35" fill="#334155" stroke="#1e293b" stroke-width="3" />
        <polygon points="370,175 350,215 380,215 360,265" fill="#facc15" stroke="#ca8a04" stroke-width="2" />
        <text x="430" y="220" font-size="34">🌪️</text>
      `;
    case 45: // Đi một ngày đàng học một sàng khôn
      return `
        <!-- Đôi chân bước trên đường -->
        <path d="M 150 250 Q 240 220 320 250" stroke="#ffd084" stroke-width="8" fill="none" />
        <!-- Chiếc sàng tre đựng ngọc trí tuệ -->
        <ellipse cx="380" cy="170" rx="65" ry="30" fill="#ca8a04" stroke="#78350f" stroke-width="4" />
        <text x="380" y="175" font-size="32" text-anchor="middle">💎📚💡</text>
      `;
    case 46: // Mặt ủ mày chau
      return `
        <!-- Khuôn mặt buồn rười rượi -->
        <circle cx="300" cy="180" r="70" fill="#fed7aa" stroke="#ea580c" stroke-width="3" />
        <!-- Đôi mày nhăn tít lại chau mày -->
        <path d="M 255 155 L 290 170" stroke="#000" stroke-width="5" stroke-linecap="round" />
        <path d="M 345 155 L 310 170" stroke="#000" stroke-width="5" stroke-linecap="round" />
        <!-- Mắt buồn & Miệng trĩu xuống -->
        <circle cx="270" cy="180" r="5" fill="#000" /><circle cx="330" cy="180" r="5" fill="#000" />
        <path d="M 270 225 Q 300 200 330 225" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round" />
      `;
    case 47: // Chim sa cá lặn
      return `
        <!-- Chim sà cánh -->
        <text x="210" y="160" font-size="44">🕊️</text>
        <path d="M 220 170 L 220 240" stroke="#ef4444" stroke-width="3" stroke-dasharray="4,4" />
        <!-- Cá lặn sâu -->
        <text x="360" y="240" font-size="44">🐟</text>
        <path d="M 370 170 L 370 230" stroke="#38bdf8" stroke-width="3" stroke-dasharray="4,4" />
        <!-- Nhan sắc tuyệt mỹ -->
        <circle cx="290" cy="130" r="28" fill="#fbcfe8" stroke="#f472b6" stroke-width="2" />
        <text x="290" y="140" font-size="24" text-anchor="middle">👸</text>
      `;
    case 48: // Vụng chèo khéo chống
      return `
        <!-- Mái chèo vụng về tuột tay -->
        <line x1="170" y1="120" x2="260" y2="240" stroke="#b45309" stroke-width="6" />
        <circle cx="215" cy="180" r="20" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,4" />
        <!-- Cây sào tre chống vững chãi -->
        <line x1="390" y1="90" x2="310" y2="260" stroke="#84cc16" stroke-width="10" stroke-linecap="round" />
        <text x="360" y="260" font-size="28">🧗</text>
      `;
    case 49: // Hoạ từ miệng mà ra
      return `
        <!-- Miệng mở to phát ngôn -->
        <ellipse cx="230" cy="180" rx="45" ry="30" fill="#dc2626" stroke="#991b1b" stroke-width="3" />
        <!-- Ngọn lửa hoạ hoạn bùng cháy từ miệng -->
        <path d="M 270 180 Q 360 140 430 160" stroke="#f97316" stroke-width="12" fill="none" />
        <text x="410" y="170" font-size="44">🔥💀</text>
      `;
    case 50: // Khẩu phật tâm xà
      return `
        <!-- Hoa sen nơi miệng -->
        <ellipse cx="220" cy="180" rx="35" ry="18" fill="#f472b6" />
        <text x="220" y="150" font-size="36" text-anchor="middle">🪷</text>
        <!-- Rắn độc trong lồng ngực -->
        <circle cx="360" cy="180" r="45" fill="#1e293b" stroke="#334155" stroke-width="3" />
        <text x="360" y="195" font-size="40" text-anchor="middle">🐍</text>
      `;
    case 51: // Nhất cử lưỡng tiện
      return `
        <!-- Một mũi tên bay xuyên -->
        <line x1="160" y1="180" x2="430" y2="180" stroke="#c5f467" stroke-width="6" stroke-linecap="round" />
        <polygon points="430,172 455,180 430,188" fill="#c5f467" />
        <!-- Hai quả táo đỏ trúng cùng lúc -->
        <circle cx="280" cy="180" r="24" fill="#ef4444" stroke="#b91c1c" stroke-width="2" />
        <circle cx="370" cy="180" r="24" fill="#ef4444" stroke="#b91c1c" stroke-width="2" />
      `;
    case 52: // Nhập gia tuỳ tục
      return `
        <!-- Cổng nhà mái ngói -->
        <polygon points="170,140 250,90 330,140" fill="#b45309" stroke="#78350f" stroke-width="3" />
        <!-- Đôi guốc cởi ngay ngắn ngoài thềm -->
        <rect x="220" y="230" width="16" height="28" rx="4" fill="#ef4444" />
        <rect x="245" y="230" width="16" height="28" rx="4" fill="#ef4444" />
        <!-- Khách chắp tay cúi chào -->
        <text x="390" y="210" font-size="44">🙇‍♂️</text>
      `;
    case 53: // Khổ tận cam lai
      return `
        <!-- Chén thuốc đắng cạn đáy -->
        <ellipse cx="220" cy="180" rx="45" ry="22" fill="#451a03" stroke="#78350f" stroke-width="3" />
        <text x="220" y="235" fill="#cbd5e1" font-weight="bold" font-size="14" text-anchor="middle">ĐẮNG NGẮT</text>
        <!-- Cành cam vàng trĩu quả ngọt -->
        <circle cx="380" cy="170" r="32" fill="#f97316" stroke="#c2410c" stroke-width="3" />
        <text x="380" y="175" font-size="34" text-anchor="middle">🍊</text>
        <text x="380" y="235" fill="#c5f467" font-weight="bold" font-size="14" text-anchor="middle">NGỌT NGÀO</text>
      `;
    case 54: // Tẩm ngẩm tầm ngầm mà đấm chết voi
      return `
        <!-- Chú bé nhỏ bé tung nắm đấm -->
        <circle cx="190" cy="190" r="18" fill="#cbd5e1" />
        <line x1="190" y1="208" x2="230" y2="190" stroke="#c5f467" stroke-width="8" stroke-linecap="round" />
        <!-- Cú đấm uy lực -->
        <text x="250" y="195" font-size="32">🥊💥</text>
        <!-- Con voi to ngã chỏng gọng -->
        <text x="380" y="210" font-size="52">🐘💫</text>
      `;
    case 55: // Đồng cam cộng khổ
      return `
        <!-- Quả cam bẻ đôi -->
        <ellipse cx="230" cy="180" rx="30" ry="30" fill="#f97316" />
        <ellipse cx="270" cy="180" rx="30" ry="30" fill="#f97316" />
        <text x="250" y="185" font-size="32" text-anchor="middle">🍊</text>
        <!-- Đòn gánh chia đôi trên vai -->
        <line x1="330" y1="180" x2="430" y2="180" stroke="#b45309" stroke-width="8" stroke-linecap="round" />
        <text x="380" y="160" font-size="28" text-anchor="middle">🤝</text>
      `;
    case 56: // Bách phát bách trúng
      return `
        <!-- Bia bắn cung hồng tâm -->
        <circle cx="300" cy="180" r="75" fill="#ef4444" stroke="#fff" stroke-width="8" />
        <circle cx="300" cy="180" r="45" fill="#fff" />
        <circle cx="300" cy="180" r="20" fill="#ef4444" />
        <!-- Bó tên găm chính giữa hồng tâm -->
        <line x1="300" y1="180" x2="350" y2="130" stroke="#c5f467" stroke-width="4" />
        <line x1="300" y1="180" x2="360" y2="150" stroke="#ffd084" stroke-width="4" />
        <text x="300" y="275" fill="#ffd084" font-weight="900" font-size="22" text-anchor="middle">100 / 100</text>
      `;
    case 57: // Thuận buồm xuôi gió
      return `
        <!-- Thuyền buồm căng gió -->
        <polygon points="210,130 330,130 250,210" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3" />
        <path d="M 190 220 L 360 220 L 330 250 L 220 250 Z" fill="#b45309" stroke="#78350f" stroke-width="3" />
        <!-- Làn gió thổi xuôi -->
        <path d="M 140 150 Q 220 130 300 150" stroke="#38bdf8" stroke-width="5" fill="none" />
        <text x="380" y="160" font-size="34">💨🌊</text>
      `;
    case 58: // Mã đáo thành công
      return `
        <!-- Tuấn mã dũng mãnh trở về -->
        <text x="240" y="200" font-size="52">🐎</text>
        <text x="350" y="160" font-size="40">🚩🏆</text>
        <text x="300" y="270" fill="#ffd084" font-weight="bold" font-size="16" text-anchor="middle">CHIẾN THẮNG TRỞ VỀ</text>
      `;
    case 59: // Giấy rách phải giữ lấy lề
      return `
        <!-- Trang sách rách mép tả tơi -->
        <path d="M 220 110 L 350 110 L 330 150 L 350 190 L 320 250 L 220 250 Z" fill="#fef08a" stroke="#ca8a04" stroke-width="2" />
        <!-- Lề gáy sách khâu chỉ đỏ thẳng tắp -->
        <line x1="220" y1="100" x2="220" y2="260" stroke="#ef4444" stroke-width="10" stroke-linecap="round" />
        <text x="280" y="180" fill="#78350f" font-weight="bold" font-size="14">TIẾT HẠNH</text>
      `;
    case 60: // Giậu đổ bìm leo
      return `
        <!-- Hàng giậu tre xiêu ngã -->
        <line x1="170" y1="230" x2="350" y2="150" stroke="#78350f" stroke-width="8" stroke-linecap="round" />
        <line x1="220" y1="240" x2="380" y2="180" stroke="#78350f" stroke-width="8" stroke-linecap="round" />
        <!-- Dây hoa bìm bìm tím leo đè lên -->
        <path d="M 190 220 Q 280 160 360 170" stroke="#22c55e" stroke-width="8" fill="none" />
        <text x="240" y="190" font-size="24">🌺</text>
        <text x="320" y="165" font-size="24">🌺</text>
      `;
    case 61: // Trứng khôn hơn vịt
      return `
        <!-- Quả trứng nhỏ đội mũ tiến sĩ cầm thước -->
        <ellipse cx="230" cy="200" rx="30" ry="40" fill="#ffedd5" stroke="#ea580c" stroke-width="2" />
        <polygon points="205,160 255,160 230,140" fill="#1e293b" />
        <text x="230" y="195" font-size="16" text-anchor="middle">🎓👓</text>
        <line x1="255" y1="200" x2="295" y2="170" stroke="#b45309" stroke-width="4" />
        <!-- Con vịt mẹ to lớn há hốc mồm ngạc nhiên -->
        <ellipse cx="380" cy="190" rx="55" ry="45" fill="#facc15" stroke="#ca8a04" stroke-width="3" />
        <circle cx="340" cy="160" r="10" fill="#fff" /><circle cx="338" cy="160" r="4" fill="#000" />
        <polygon points="325,170 295,175 325,185" fill="#f97316" />
      `;
    case 62: // Thêu dệt chuyện hoang đường
      return `
        <!-- Cây kim thêu chỉ vàng -->
        <line x1="180" y1="120" x2="260" y2="180" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round" />
        <circle cx="185" cy="125" r="3" fill="#000" />
        <path d="M 180 120 Q 140 100 170 80" stroke="#ffd084" stroke-width="3" fill="none" />
        <!-- Con rồng bay kỳ dị hoang đường trên khung dệt -->
        <rect x="260" y="140" width="160" height="110" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="3" />
        <text x="340" y="200" font-size="44" text-anchor="middle">🐉✨</text>
        <text x="340" y="235" fill="#c084fc" font-size="12" font-weight="bold" text-anchor="middle">HOANG ĐƯỜNG</text>
      `;
    default:
      return '';
  }
}

// Process all questions
const formattedQuestions = questions.map(q => {
  const words = q.phrase.trim().split(/\s+/);
  const normalized = removeVietnameseTones(q.phrase);
  
  // Construct variations of accepted answers
  const accepted = [
    q.phrase.toLowerCase().trim(),
    normalized,
    // Without punctuation or extra spaces
    q.phrase.replace(/[^a-zA-Z0-9À-ỹ\s]/g, "").toLowerCase().trim(),
    normalized.replace(/[^a-zA-Z0-9\s]/g, "").trim()
  ];

  q.words = words;
  q.wordLengths = words.map(w => w.length);
  q.wordCount = words.length;
  q.normalized = normalized;
  q.accepted = Array.from(new Set(accepted));
  q.svg = generateSvgForQuestion(q);
  return q;
});

const fileContent = `/**
 * Pool 62 câu hỏi game Đuổi Hình Bắt Chữ - Livestream Game Show Edition
 * Đầy đủ SVG vector trực quan, tách từ preview gạch chân, biến thể chấm điểm & giải thích ý nghĩa.
 */
window.DHBC_QUESTIONS = ${JSON.stringify(formattedQuestions, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '..', 'duoihinhbatchu-data.js'), fileContent, 'utf8');
console.log(`Successfully generated ${formattedQuestions.length} questions in duoihinhbatchu-data.js!`);
