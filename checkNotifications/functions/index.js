const functions = require("firebase-functions");
const serviceAccount = require("./config/key.json");
const admin = require("firebase-admin");
const geolib = require("geolib");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "share-app-mobile",
  databaseURL: "https://share-app-mobile-default-rtdb.firebaseio.com",
});

const notificationsRef = admin.database().ref("notifications");
const refUser = functions.database.ref("/users/{userId}");

exports.checkNotifications = refUser.onWrite(async (change, context) => {
  const user = change.after.exists() ? change.after.val() : change.before.val();
  const userCoords = {latitude: user.lat, longitude: user.lng};
  // const oldUser = change.before.val();
  // const oldUserCoords = {latitude: oldUser.lat, longitude: oldUser.lng};

  // Verifica se a nova localização é superior a 50 metros
  // const newDistance = geolib.getDistance(userCoords, oldUserCoords);
  // if (newDistance < 50) {
  // return;
  // }

  const querySnapshot = await notificationsRef.once("value");

  querySnapshot.forEach(async (snapshot) => {
    const notification = snapshot.val();

    const rec = notification.receivers;

    if (rec && rec.includes(user.id)) {
      return;
    }

    const notCoords = {latitude: notification.lat, longitude: notification.lng};

    const distance = geolib.getDistance(userCoords, notCoords);

    if (distance <= 100) {
      const payload = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
      };
      await admin.messaging().sendToDevice(user.fcmToken, payload);

      const refReceivers = snapshot.ref.child("receivers");
      if ((await refReceivers.once("value")).exists()) {
        await refReceivers.update([...notification.receivers, user.id]);
      } else {
        await refReceivers.set([user.id]);
      }
    }
  });
});
