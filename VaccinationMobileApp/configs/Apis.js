import axios from "axios";

const BASE_URL = "http://192.168.1.14:8000"; // Chạy bằng IP Lan máy tính

export const endpoints = {
  register: "users/",
  login: "o/token/",
  currentUser: "users/current-user/",
};

export const authApis = (token) => {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export default axios.create({
  baseURL: BASE_URL,
});