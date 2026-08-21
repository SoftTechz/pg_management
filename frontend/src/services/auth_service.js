import api from "@/config/axios";

export const loginWithPin = async (pin) => {
  try {
    const response = await api.post("/auth/login", { pin });
    return response.data;
  } catch (error) {
    if (error.response) {
      // Backend error (401, 400, 500)
      throw new Error(error.response.data.detail);
    } else {
      // Network / timeout error
      throw new Error("Server not reachable");
    }
  }
};

export const changePin = async (currentPin, newPin) => {
  try {
    const response = await api.post("/auth/change-pin", {
      current_pin: currentPin,
      new_pin: newPin,
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      // Backend error (401, 400, 500)
      throw new Error(error.response.data.detail);
    } else {
      // Network / timeout error
      throw new Error("Server not reachable");
    }
  }
};
