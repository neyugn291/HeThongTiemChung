import axios from "axios";

const BASE_URL = "http://192.168.1.11:8000/"; // Chạy bằng IP Lan máy tính


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
  allAppointment: "appointments/all/",
  confirmAppointment: (id) => `appointments/${id}/mark-confirm/`,
  inoculateAppointment: (id) => `appointments/${id}/mark-inoculated/`,
  vaccines: (id) => (id ? `vaccines/${id}/` : "vaccines/"),
  vaccineTypes: (id) => (id ? `vaccine-types/${id}/` : "vaccine-types/"),
  schedules: (id) => (id ? `schedules/${id}/` : "schedules/"),
  sites: (id) => (id ? `sites/${id}/` : "sites/"),
  toggleReminder: (id) => `/appointment/${id}/toggle-reminder/`,
  records: (recordId) => `records/${recordId}/add-health-note/`,
  user: (id) => (id ? `users/${id}/` : "users/"),
  chatMessages: "chat-messages/",
  aiChat: "ai-chat/",
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