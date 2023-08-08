import { createStore, produce } from "solid-js/store";
import { Glide, UseGlideState } from "../types/Glide";
import { createSignal, onMount } from "solid-js";
import * as api from "../api/glide";
import { FirebaseError } from "firebase/app";
import { Unsubscribe } from "firebase/firestore";
import { useAuthState } from "../context/auth";

type State = UseGlideState & {
  freshGlides: Glide[];
}

const createInitState = () => ({ pages: {}, loading: false, lastGlide: null, freshGlides: [] });

const useGlides = () => {
  const { user } = useAuthState()!;
  const [page, setPage] = createSignal(1);
  const [store, setStore] = createStore<State>(createInitState());

  let unSubscribe: Unsubscribe;

  onMount(() => {
    loadGlides();
  })

  const loadGlides = async () => {
    const _page = page();

    if (_page > 1 && !store.lastGlide) return;

    setStore("loading", true);
    try {
      const { glides, lastGlide } = await api.getGlides(user!, store.lastGlide);

      if (glides.length > 0) {
        setStore(produce((store) => {
          store.pages[_page] = { glides }
        }))

        setPage(_page + 1);
      }

      setStore("lastGlide", lastGlide);
    } catch (error) {
      const messgae = (error as FirebaseError).message;
      console.log(messgae);
    } finally {
      setStore("loading", false);
    }
  }

  const subscribeToGlides = () => {
    if (user?.following.length == 0) return;

    unSubscribe = api.subscribeToGlides(user!, (freshGlides: Glide[]) => {
      setStore("freshGlides", freshGlides);
    });
  }

  const unsubscribeFromGlides = () => {
    if (!!unSubscribe) {
      unSubscribe();
    }
  }

  const resubscribe = () => {
    unsubscribeFromGlides();
    subscribeToGlides();
  }

  const addGlide = (glide: Glide | undefined) => {
    if (!glide) return;

    const page = 1;

    setStore(produce(store => {
      if (!store.pages[page]) {
        store.pages[page] = { glides: [] };
      }

      store.pages[page].glides.unshift({ ...glide });
    }))
  }

  const displayFreshGlides = () => {
    store.freshGlides.forEach(freshGlide => {
      addGlide(freshGlide);
    })

    setStore("freshGlides", []);
    resubscribe();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return {
    page,
    loadGlides,
    addGlide,
    store,
    subscribeToGlides,
    unsubscribeFromGlides,
    displayFreshGlides,
  }
}

export default useGlides;