const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");
const { CloudTasksClient } = require("@google-cloud/tasks");

admin.initializeApp();

const tasksClient = new CloudTasksClient();

// [A] 즉시 발송 API
exports.sendInstantNotification = onRequest(async (req, res) => {
  try {
    const { token, title, body } = req.body;

    const message = {
      notification: { title, body },
      token: token
    };

    const response = await admin.messaging().send(message);
    res.status(200).send({ success: true, messageId: response });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// [B] 예약 발송 스케줄러 등록 API (Cloud Tasks 연동)
exports.scheduleNotification = onRequest(async (req, res) => {
  try {
    const { token, title, body, scheduleTime } = req.body; // scheduleTime은 ISOString 형태

    const project = process.env.GCLOUD_PROJECT;
    const location = "asia-northeast3"; // 본인의 Functions 리전
    const queue = "notification-queue"; // Cloud Tasks에서 생성할 큐 이름

    // 예약 발송을 처리할 백엔드 자신 또는 별도 Worker의 URL
    const url = `https://${location}-${project}.cloudfunctions.net/sendInstantNotification`;

    const queuePath = tasksClient.queuePath(project, location, queue);
    const task = {
      httpRequest: {
        httpMethod: "POST",
        url: url,
        headers: { "Content-Type": "application/json" },
        body: Buffer.from(JSON.stringify({ token, title, body })).toString("base64"),
      },
      scheduleTime: {
        seconds: Math.floor(new Date(scheduleTime).getTime() / 1000)
      }
    };

    const [response] = await tasksClient.createTask({ parent: queuePath, task });
    res.status(200).send({ success: true, taskName: response.name });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

exports.naverLogin = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { code } = req.body;
    if (!code) {
      res.status(400).send("인증 코드가 없습니다.");
      return;
    }

    const clientId = "hemXaBshyStfBhmNg05m";
    const clientSecret = "Ddn4W7NwPs";

    try {
      // 네이버 토큰 발급 요청
      const tokenResponse = await axios.get("https://nid.naver.com/oauth2.0/token", {
        params: {
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          state: "state",
        },
      });

      const accessToken = tokenResponse.data.access_token;
      if (!accessToken) throw new Error("네이버 Access Token 발급 실패");

      // 네이버 사용자 프로필 조회
      const profileResponse = await axios.get("https://openapi.naver.com/v1/nid/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const profile = profileResponse.data.response;
      if (!profile || !profile.id) throw new Error("프로필 조회 실패");

      const uid = `naver:${profile.id}`;
      const email = (profile.email || `${profile.id}@naver.com`).toLowerCase();
      const name = profile.name || profile.nickname || "네이버 유저";

      let firebaseUid = uid;

      // 파이어베이스 유저 생성 (없으면 만들고, 있으면 통과)
      try {
        await admin.auth().getUser(firebaseUid);
      } catch (error) {
        if (error.code === "auth/user-not-found") {
          try {
            const existingUser = await admin.auth().getUserByEmail(email);
            firebaseUid = existingUser.uid;
            console.log(`[Naver Login] 기존 계정(${email})과 네이버 계정을 연동합니다. UID: ${firebaseUid}`);
          } catch (emailError) {
            if (emailError.code === "auth/user-not-found") {
              // 이메일도 존재하지 않으면 완전 신규 가입 처리
              console.log(`[Naver Login] 신규 네이버 유저 가입을 진행합니다. Email: ${email}`);
              await admin.auth().createUser({
                uid: firebaseUid,
                email: email,
                displayName: name,
              });
            } else {
              throw emailError;
            }
          }
        } else {
          throw error;
        }
      }

      // 파이어베이스 커스텀 로그인 토큰 생성
      const firebaseToken = await admin.auth().createCustomToken(firebaseUid);

      // 프론트엔드로 성공 응답
      res.status(200).json({ firebaseToken });
    } catch (error) {
      console.error("네이버 로그인 처리 에러:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

exports.kakaoLogin = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { code, redirectUri } = req.body;
    if (!code) {
      res.status(400).send("인증 코드가 없습니다.");
      return;
    }

    const clientId = "af28f94aa8260ab663fd27dffea1ee77";
    const currentRedirectUri = redirectUri || "https://iseohyun.com/small-project/KanaLoop/";

    try {
      // 카카오 토큰 발급 요청
      const tokenPayload = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        redirect_uri: currentRedirectUri,
        code: code,
      });

      const tokenResponse = await axios.post("https://kauth.kakao.com/oauth/token", tokenPayload.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      });

      const accessToken = tokenResponse.data.access_token;
      if (!accessToken) throw new Error("카카오 Access Token 발급 실패");

      // 카카오 사용자 프로필 조회
      const profileResponse = await axios.get("https://kapi.kakao.com/v2/user/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      });

      const profile = profileResponse.data;
      if (!profile || !profile.id) throw new Error("프로필 조회 실패");

      const uid = `kakao:${profile.id}`;
      const kakaoAccount = profile.kakao_account || {};
      const email = (kakaoAccount.email || `${profile.id}@kakao.com`).toLowerCase();
      const name = profile.properties?.nickname || kakaoAccount.profile?.nickname || "카카오 유저";

      console.log(`[Kakao Login] 수신된 이름: ${name}, 수신된 이메일: ${email}`);
      if (!kakaoAccount.email) {
        console.warn("[Kakao Login] 경고: 카카오계정 이메일이 제공되지 않아 임시 이메일이 할당되었습니다. 다른 소셜 로그인과의 진도 연동이 불가합니다.");
      }

      let firebaseUid = uid;

      // 파이어베이스 유저 생성 (없으면 만들고, 있으면 기존 계정과 연동)
      try {
        await admin.auth().getUser(firebaseUid);
        // 기존 유저가 존재하더라도, 깡통 이름이 아니라면 최신 닉네임으로 파이어베이스 프로필 갱신
        if (name !== "카카오 유저") await admin.auth().updateUser(firebaseUid, { displayName: name });
      } catch (error) {
        if (error.code === "auth/user-not-found") {
          try {
            const existingUser = await admin.auth().getUserByEmail(email);
            firebaseUid = existingUser.uid;
          } catch (emailError) {
            if (emailError.code === "auth/user-not-found") {
              await admin.auth().createUser({ uid: firebaseUid, email: email, displayName: name });
            } else {
              throw emailError;
            }
          }
        } else {
          throw error;
        }
      }

      // 파이어베이스 커스텀 로그인 토큰 생성
      const firebaseToken = await admin.auth().createCustomToken(firebaseUid);
      res.status(200).json({ firebaseToken });
    } catch (error) {
      // 에러 상세 캡처 (바디가 비어있을 경우를 대비한 다중 폴백)
      const errorData = error.response ? error.response.data : null;
      const errorDetail = errorData || error.message;

      console.error("카카오 로그인 처리 에러 상세:", {
        message: error.message,
        status: error.response?.status,
        data: errorData
      });
      res.status(500).json({ error: errorDetail });
    }
  }
);
