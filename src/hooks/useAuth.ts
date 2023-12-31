import { createSignal } from "solid-js";
import { AuthType, authenticate } from "../api/auth";
import { AuthForm } from "../types/Form";
import { FirebaseError } from "firebase/app";
import { useUIDispatch } from "../context/ui";

const useAuth = (authType: AuthType) => {
  const [loading, setLoading] = createSignal(false);
  const {addSnackbar} = useUIDispatch();

  const authUser = async (form: AuthForm) => {
    setLoading(true);

    try {
      await authenticate(form, authType);
      addSnackbar({message: "Welcome to Glider", type: "success"});
    } catch (error) {
      const message = (error as FirebaseError).message;
      addSnackbar({message: message, type: "error"});
    } finally {
      setLoading(false);
    }
  }

  return {
    authUser, loading
  }
}

export default useAuth;