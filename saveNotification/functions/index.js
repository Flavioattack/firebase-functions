const functions = require("firebase-functions");
const serviceAccount = require("./config/key.json");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const moment = require("moment-timezone");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "share-app-mobile",
  databaseURL: "https://share-app-mobile-default-rtdb.firebaseio.com",
});

exports.saveNotification = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const {userId, body, title, lat, lng} = req.body;

    try {
      // Obter a data e hora atual no fuso horário de Brasília
      const now = moment().tz("America/Sao_Paulo");

      // Salva os dados no banco de dados do Firebase
      const notificationsRef = admin.database().ref("notifications");
      const newNotificationRef = notificationsRef.push();
      const notification = {
        id: newNotificationRef.key,
        userId,
        body,
        title,
        lat,
        lng,
        created_at: now.format("YYYY-MM-DD HH:mm:ss"),
      };
      await newNotificationRef.set(notification);

      // Agendando a exclusão da notificação em 5 minutos
      const notificationKey = newNotificationRef.key;
      setTimeout(() => {
        admin.database().ref(`notifications/${notificationKey}`).remove();
      }, 5 * 60 * 1000);

      res.status(200).send({message: "Notificação salva com sucesso!"});
    } catch (e) {
      console.error(e);
      res.status(500).send({error: e.message});
    }
  });
});
