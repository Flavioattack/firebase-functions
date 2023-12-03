const functions = require("firebase-functions");
const serviceAccount = require("./config/key.json");
const admin = require("firebase-admin");
// const geolib = require("geolib");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "share-app-mobile",
  databaseURL: "https://share-app-mobile-default-rtdb.firebaseio.com",
});

const fireRef = functions.database.ref(("/notifications/{notificationId}"));

exports.sendNotification = fireRef.onCreate(async (snap, context) => {
  const notificationData = snap.val();
  const usersRef = admin.database().ref("users");
  const usersSnapshot = await usersRef.once("value");
  const nearbyUsers = [];

  // Recuperando Usuários aptos a receber a notificação
  usersSnapshot.forEach((userSnapshot) => {
    const userData = userSnapshot.val();
    // const distance = geolib.getDistance(
    // {latitude: notificationData.lat, longitude: notificationData.lng},
    // {latitude: userData.lat, longitude: userData.lng},
    // );
    if (userData.id != notificationData.userId) {
      nearbyUsers.push({id: userSnapshot.key,
        fcmToken: userData.fcmToken,
        recId: userData.id});
    }
  });

  const receivers = [];

  for (const user of nearbyUsers) {
    console.log(`Enviando notificação para o usuário ${user.id}...`);
    receivers.push(user.recId);

    const message = {
      notification: {
        title: notificationData.title,
        body: notificationData.body,
      },
      token: user.fcmToken,
    };
    await admin.messaging().send(message);
  }

  // Verifica se o campo receivers existe e cria um array vazio caso não exista
  if (!notificationData.receivers) {
    notificationData.receivers = [];
  }

  // Atualiza a notificação com os receivers
  const refReceivers = snap.ref.child("receivers");
  await refReceivers.set([...notificationData.receivers, ...receivers]);

  return null;
});
