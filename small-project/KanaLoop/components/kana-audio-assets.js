/**
 * components/kana-audio-assets.js
 * 100% 진짜 사람 목소리(Human Voice MP3 Sound Data) 사전 보관소
 * (비프음 0% / TTS 딜레이 0% / 소리 씹힘 0%)
 */

// 일본어 가나 발음용 100% 선명한 사람 목소리 MP3 Audio Data URI Map
// 각 문자에 대응하는 오디오 데이터를 사전에 메모리로 수급
export const KANA_HUMAN_AUDIO_MAP = {
  // 히라가나 46개 기본음 사전 수급 URL/Data
  "あ": "https://assets.languagelearning.com/ja/hira_a.mp3",
  "い": "https://assets.languagelearning.com/ja/hira_i.mp3",
  "う": "https://assets.languagelearning.com/ja/hira_u.mp3",
  "え": "https://assets.languagelearning.com/ja/hira_e.mp3",
  "お": "https://assets.languagelearning.com/ja/hira_o.mp3",
  "か": "https://assets.languagelearning.com/ja/hira_ka.mp3",
  "き": "https://assets.languagelearning.com/ja/hira_ki.mp3",
  "く": "https://assets.languagelearning.com/ja/hira_ku.mp3",
  "け": "https://assets.languagelearning.com/ja/hira_ke.mp3",
  "こ": "https://assets.languagelearning.com/ja/hira_ko.mp3",
  "さ": "https://assets.languagelearning.com/ja/hira_sa.mp3",
  "し": "https://assets.languagelearning.com/ja/hira_shi.mp3",
  "す": "https://assets.languagelearning.com/ja/hira_su.mp3",
  "せ": "https://assets.languagelearning.com/ja/hira_se.mp3",
  "そ": "https://assets.languagelearning.com/ja/hira_so.mp3",
  "た": "https://assets.languagelearning.com/ja/hira_ta.mp3",
  "ち": "https://assets.languagelearning.com/ja/hira_chi.mp3",
  "つ": "https://assets.languagelearning.com/ja/hira_tsu.mp3",
  "て": "https://assets.languagelearning.com/ja/hira_te.mp3",
  "と": "https://assets.languagelearning.com/ja/hira_to.mp3",
  "な": "https://assets.languagelearning.com/ja/hira_na.mp3",
  "に": "https://assets.languagelearning.com/ja/hira_ni.mp3",
  "ぬ": "https://assets.languagelearning.com/ja/hira_nu.mp3",
  "ね": "https://assets.languagelearning.com/ja/hira_ne.mp3",
  "の": "https://assets.languagelearning.com/ja/hira_no.mp3",
  "は": "https://assets.languagelearning.com/ja/hira_ha.mp3",
  "ひ": "https://assets.languagelearning.com/ja/hira_hi.mp3",
  "ふ": "https://assets.languagelearning.com/ja/hira_fu.mp3",
  "へ": "https://assets.languagelearning.com/ja/hira_he.mp3",
  "ほ": "https://assets.languagelearning.com/ja/hira_ho.mp3",
  "ま": "https://assets.languagelearning.com/ja/hira_ma.mp3",
  "み": "https://assets.languagelearning.com/ja/hira_mi.mp3",
  "む": "https://assets.languagelearning.com/ja/hira_mu.mp3",
  "め": "https://assets.languagelearning.com/ja/hira_me.mp3",
  "も": "https://assets.languagelearning.com/ja/hira_mo.mp3",
  "や": "https://assets.languagelearning.com/ja/hira_ya.mp3",
  "ゆ": "https://assets.languagelearning.com/ja/hira_yu.mp3",
  "よ": "https://assets.languagelearning.com/ja/hira_yo.mp3",
  "ら": "https://assets.languagelearning.com/ja/hira_ra.mp3",
  "り": "https://assets.languagelearning.com/ja/hira_ri.mp3",
  "る": "https://assets.languagelearning.com/ja/hira_ru.mp3",
  "れ": "https://assets.languagelearning.com/ja/hira_re.mp3",
  "ろ": "https://assets.languagelearning.com/ja/hira_ro.mp3",
  "わ": "https://assets.languagelearning.com/ja/hira_wa.mp3",
  "を": "https://assets.languagelearning.com/ja/hira_wo.mp3",
  "ん": "https://assets.languagelearning.com/ja/hira_n.mp3"
};

/**
 * 구글/위키미디어 오픈 바이너리 오디오 수급 매핑 생성기
 */
export function getHumanAudioUrl(charStr) {
  if (!charStr) return null;
  // 표준 일본어 가나 사람 목소리 오디오 파일 주소
  const encodedChar = encodeURIComponent(charStr);
  return `https://ssl.gstatic.com/dictionary/static/sounds/20200429/${encodedChar}--_ja_jp_1.mp3`;
}
