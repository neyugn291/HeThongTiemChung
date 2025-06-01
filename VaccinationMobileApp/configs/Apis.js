import axios from "axios";



// const BASE_URL = "http://192.168.1.14:8000"; // Chạy bằng IP Lan máy tính
const BASE_URL = "http://192.168.4.41:8000"; // Chạy bằng IP Lan máy tính


export const endpoints = {
  register: "users/",
  login: "o/token/",
  currentUser: "users/current-user/",
  recordSearch: "records/history/",
  certificate: (recordId) => `/records/${recordId}/certificate/`, // Endpoint động  
  injectionSites: "sites/",
  allSchedules: "schedules/",
  upcomingSchedules: "schedules/upcoming_schedules/",
  appointment: (id) => (id ? `appointment/${id}/` : "appointment/"),
  vaccines: (id) => (id ? `vaccines/${id}/` : "vaccines/"),
  vaccineTypes: (id) => (id ? `vaccine-types/${id}/` : "vaccine-types/"),
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