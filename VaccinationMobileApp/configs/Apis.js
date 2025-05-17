import axios from "axios";

const BASE_URL = "http://192.168.1.69:8000/"; // Chạy bằng IP Lan máy tính

export const endpoints = {
  register: "users/",
  login: "o/token/",
  currentUser: "users/current-user/",
  recordSearch: "records/history/",
  downloadCertificate: "records/certificate/",
  injectionSites: "sites/",
  allSchedules: "schedules/all_schedules/",
  upcomingSchedules: "schedules/upcoming_schedules/",
  appointments: "appointments/",
  vaccines: "vaccines/",
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