const functions = require("firebase-functions");
const serviceAccount = require("./config/key.json");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "share-app-mobile",
  databaseURL: "https://share-app-mobile-default-rtdb.firebaseio.com",
});

exports.saveUserLocation = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const {uid, lat, lng, fcmToken, name} = req.body;

    try {
      const userRef = admin.database().ref("users");
      const compareId = userRef.orderByChild("id").equalTo(uid).once("value");
      const querySnapshot = await userRef.once("value");
      const userSnapshot = await compareId;
      let newUserKey;

      if (userSnapshot.exists()) {
        // UID já existe, obter o sequencial correspondente, se torna
        const existingUserKey = Object.keys(userSnapshot.val())[0];
        await userRef.child(existingUserKey).remove();

        newUserKey = existingUserKey;
      } else {
        let lastUserKey = 0;

        querySnapshot.forEach((snapshot) => {
          const userKey = parseInt(snapshot.key, 10);
          if (userKey > lastUserKey) {
            lastUserKey = userKey;
          }
        });

        newUserKey = (lastUserKey + 1).toString();
      }

      await userRef.child(newUserKey).set({id: uid, lat, lng, fcmToken, name});

      res.status(200).send({message: "Localização atualizada com sucesso"});
    } catch (e) {
      console.error(e);
      res.status(500).send({error: e.message});
    }
  });
});

