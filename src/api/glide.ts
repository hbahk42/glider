import { DocumentReference, QueryConstraint, QueryDocumentSnapshot, Timestamp, addDoc, collection, doc, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, setDoc, startAfter, updateDoc, where } from "firebase/firestore";
import { db } from "../db";
import { Glide, UserGlide } from "../types/Glide";
import { User } from "../types/User";
import { UploadImage } from "../types/Form";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const uploadImage = async (image: UploadImage) => {
  const storage = getStorage();
  const storageRef = ref(storage, image.name);

  const uploadResult = await uploadBytes(storageRef, image.buffer);
  const downloadUrl = await getDownloadURL(uploadResult.ref);
  return downloadUrl;
}

const getGlideById = async (id: string, uid: string) => {
  const userDocRef = doc(db, "users", uid);
  const userGlideRef = doc(userDocRef, "glides", id);

  const userGlideSnap = await getDoc(userGlideRef);
  const userGlide = userGlideSnap.data() as UserGlide;
  const glideSnap = await getDoc(userGlide.lookup);
  const userDocSnap = await getDoc(userDocRef);

  const glide = {
    ...glideSnap.data(),
    user: userDocSnap.data(),
    id: glideSnap.id,
    lookup: glideSnap.ref.path
  } as Glide;

  return glide;
}

const getGlides = async (loggedInUser: User, lastGlide: QueryDocumentSnapshot | null) => {
  const _loggedInUserDoc = doc(db, "users", loggedInUser.uid);
  const constraints: QueryConstraint[] = [
    orderBy("date", "desc"),
    limit(10),
  ]

  if (loggedInUser.following.length > 0) {
    constraints.push(where("user", "in", [...loggedInUser.following, _loggedInUserDoc]));
  } else {
    constraints.push(where("user", "==", _loggedInUserDoc));
  }

  if (!!lastGlide) {
    constraints.push(startAfter(lastGlide));
  }

  const q = query(collection(db, "glides"), ...constraints);

  const qSnapshop = await getDocs(q);
  const _lastGlide = qSnapshop.docs[qSnapshop.docs.length - 1];

  const glides = await Promise.all(qSnapshop.docs.map(async doc => {
    const glide = doc.data() as Glide;
    const userSnap = await getDoc(glide.user as DocumentReference);
    glide.user = userSnap.data() as User;

    return { ...glide, id: doc.id, lookup: doc.ref.path };
  }))

  return { glides, lastGlide: _lastGlide };
}

const getSubglides = async (glideLookup: string, lastGlide: QueryDocumentSnapshot | null) => {
  const ref = doc(db, glideLookup);
  const _collection = collection(ref, "glides");

  const constraints: QueryConstraint[] = [
    orderBy("date", "desc"),
    limit(10),
  ]

  if (lastGlide !== null) {
    constraints.push(startAfter(lastGlide));
  }

  const q = query(
    _collection,
    ...constraints
  )

  const querySnapshot = await getDocs(q);
  const _lastGlide = querySnapshot.docs[querySnapshot.docs.length - 1];

  const glides = await Promise.all(querySnapshot.docs.map(async doc => {
    const glide = doc.data() as Glide;
    const userSnap = await getDoc(glide.user as DocumentReference);
    glide.user = userSnap.data() as User;

    return { ...glide, id: doc.id, lookup: doc.ref.path };
  }))

  return {
    glides,
    lastGlide: _lastGlide,
  }
}

const subscribeToGlides = (loggedInUser: User, getCallback: (g: Glide[]) => void) => {
  const _collection = collection(db, "glides");

  const constraints = [
    where("date", ">", Timestamp.now())
  ];

  if (loggedInUser.following.length > 0) {
    constraints.push(where("user", "in", loggedInUser.following));
  }

  const q = query(
    _collection,
    ...constraints
  )

  return onSnapshot(q, async (querySnapshot) => {
    const glides = await Promise.all(querySnapshot.docs.map(async doc => {
      const glide = doc.data() as Glide;
      const userSnap = await getDoc(glide.user as DocumentReference);
      glide.user = userSnap.data() as User;
      return { ...glide, id: doc.id, lookup: doc.ref.path }
    }));

    getCallback(glides);
  });
}

const getGlideCollection = (answerTo?: string) => {
  let glideCollection;

  if (!!answerTo) {
    const ref = doc(db, answerTo);
    glideCollection = collection(ref, "glides");
  } else {
    glideCollection = collection(db, "glides");
  }

  return glideCollection;
}

const createGlide = async (form: {
  content: string;
  uid: string;
}, answerTo?: string): Promise<Glide> => {
  const userRef = doc(db, "users", form.uid);
  const glideCollection = getGlideCollection(answerTo);
  const glideToStore = {
    ...form,
    user: userRef,
    likesCount: 0,
    subglidesCount: 0,
    date: Timestamp.now()
  }

  if (!!answerTo) {
    const ref = doc(db, answerTo);
    await updateDoc(ref, {
      subglidesCount: increment(1)
    })
  }

  const added = await addDoc(glideCollection, glideToStore);

  const userGliderRef = doc(userRef, "glides", added.id);
  await setDoc(userGliderRef, { lookup: added });

  return { ...glideToStore, id: added.id, lookup: added.path };
}

export {
  createGlide,
  getGlides,
  subscribeToGlides,
  getGlideById,
  getSubglides,
  uploadImage,
}