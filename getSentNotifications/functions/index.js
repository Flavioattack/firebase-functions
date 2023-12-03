const functions = require("firebase-functions");
const serviceAccount = require("./config/key.json");
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "share-app-mobile",
  databaseURL: "https://share-app-mobile-default-rtdb.firebaseio.com",
});

exports.getSentNotifications = functions.https.onRequest(async (req, res) => {
  const {userId} = req.body;

  if (!userId) {
    res.status(400).json({message: "Parâmetro userId não fornecido"});
    return;
  }

  const db = admin.database();
  const usersRef = db.ref("users");
  const notificationsRef = db.ref("notifications");

  try {
    let userExists = false;
    const userSnapshot = await usersRef.once("value");
    userSnapshot.forEach((childSnapshot) => {
      const userData = childSnapshot.val();
      if (userData.id === userId) {
        userExists = true;
        return true; // Encerra o loop forEach se o usuário for encontrado
      }
    });

    if (!userExists) {
      res.status(404).json({message: "Usuário não encontrado"});
      return;
    }

    const userIdNotification = notificationsRef.orderByChild("userId");
    const snapshot = await userIdNotification.equalTo(userId).once("value");
    const notifications = [];

    snapshot.forEach((childSnapshot) => {
      const notification = childSnapshot.val();
      const {title, body} = notification;
      notifications.push({title, body});
    });

    res.status(200).json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: error.message});
  }
});
