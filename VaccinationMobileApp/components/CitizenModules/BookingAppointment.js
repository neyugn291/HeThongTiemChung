import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

const BookingAppointment = ({ navigation }) => {
  const [schedules, setSchedules] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [displayedItems, setDisplayedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchSchedules();
    fetchUserAppointments();
  }, []);

  // Lấy lịch tiêm từ API schedules
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");
      console.log("Fetching schedules with token:", token.substring(0, 10) + "...");
      const response = await authApis(token).get(endpoints["upcomingSchedules"]);
      console.log("Schedules API response:", JSON.stringify(response.data, null, 2));
      const sortedSchedules = response.data
        .filter((item) => item.date && new Date(item.date).getTime() >= new Date().setHours(0, 0, 0, 0))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setSchedules(sortedSchedules);
      if (!showAllAppointments) {
        filterItems(sortedSchedules, 1);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error.response?.data || error.message);
      Alert.alert("Lỗi", "Không thể tải danh sách lịch tiêm. Vui lòng kiểm tra kết nối hoặc đăng nhập lại.");
      setSchedules([]);
      if (!showAllAppointments) setDisplayedItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Lấy lịch hẹn của người dùng
  const fetchUserAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");
      console.log("Fetching appointments with token:", token.substring(0, 10) + "...");
      console.log("Appointment endpoint:", endpoints.appointment());
      const response = await authApis(token).get(endpoints.appointment());
      console.log("Appointments API response:", JSON.stringify(response.data, null, 2));
      if (!Array.isArray(response.data)) {
        console.warn("Appointments data is not an array:", response.data);
        throw new Error("Dữ liệu lịch hẹn không hợp lệ.");
      }
      const upcomingAppointments = response.data
        .filter((item) => {
          try {
            return (
              item.registered_at &&
              new Date(item.registered_at).getTime() >= new Date().setHours(0, 0, 0, 0)
            );
          } catch (e) {
            console.warn("Invalid appointment data:", item);
            return false;
          }
        })
        .sort((a, b) => new Date(a.registered_at) - new Date(b.registered_at));
      const pastAppointments = response.data
        .filter((item) => {
          try {
            return (
              item.registered_at &&
              new Date(item.registered_at).getTime() < new Date().setHours(0, 0, 0, 0)
            );
          } catch (e) {
            console.warn("Invalid appointment data:", item);
            return false;
          }
        })
        .sort((a, b) => new Date(a.registered_at) - new Date(b.registered_at));
      const sortedAppointments = [...upcomingAppointments, ...pastAppointments];
      console.log(
        "Sorted appointments:",
        sortedAppointments.map((item) => ({
          id: item.id,
          registered_at: item.registered_at,
          schedule_id: item.schedule,
          status: item.is_confirmed ? "confirmed" : "pending",
        }))
      );
      setAppointments(sortedAppointments);
      if (showAllAppointments) {
        filterItems(sortedAppointments, 1);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error.response?.data || error.message);
      Alert.alert("Lỗi", "Không thể tải danh sách lịch hẹn. Vui lòng kiểm tra kết nối hoặc đăng nhập lại.");
      setAppointments([]);
      if (showAllAppointments) setDisplayedItems([]);
    }
  };

  // Lọc và phân trang
  const filterItems = (data, pageNum) => {
    const startIndex = (pageNum - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = data.slice(startIndex, endIndex);
    setDisplayedItems((prev) =>
      pageNum === 1 ? paginatedItems : [...prev, ...paginatedItems]
    );
  };

  // Tải thêm
  const loadMoreItems = () => {
    if (isLoadingMore || displayedItems.length >= (showAllAppointments ? appointments.length : schedules.length)) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    filterItems(showAllAppointments ? appointments : schedules, nextPage);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

  // Toggle hiển thị lịch hẹn
  const toggleAllAppointments = () => {
    setShowAllAppointments((prev) => !prev);
    setPage(1);
    setDisplayedItems([]);
    filterItems(!showAllAppointments ? appointments : schedules, 1);
  };

  // Kiểm tra lịch trùng
  const checkDuplicateAppointment = (schedule) => {
    return appointments.some(
      (appointment) =>
        appointment.schedule === schedule.id &&
        ["confirmed", "pending"].includes(appointment.is_confirmed ? "confirmed" : "pending")
    );
  };

  // Đặt lịch (POST API)
  const bookAppointment = async (schedule) => {
    if (checkDuplicateAppointment(schedule)) {
      Alert.alert("Cảnh báo", "Bạn đã có lịch hẹn cho lịch tiêm này.");
      return;
    }
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");
      console.log("Booking appointment with token:", token.substring(0, 10) + "...");
      console.log("POST appointment endpoint:", endpoints.appointment());
      const bodyOptions = [
        { schedule_id: schedule.id },
        { schedule: schedule.id },
        { schedule_id: schedule.id.toString() },
        { schedule: schedule.id.toString() },
      ];
      let success = false;
      let lastError = null;
      for (const body of bodyOptions) {
        try {
          console.log("Trying POST with body:", body);
          const response = await authApis(token).post(endpoints.appointment(), body);
          console.log("Booking API response:", JSON.stringify(response.data, null, 2));
          Alert.alert("Thành công", "Đặt lịch hẹn thành công!");
          fetchUserAppointments();
          success = true;
          break;
        } catch (error) {
          console.warn("POST attempt failed with body:", body, "Error:", error.response?.data);
          lastError = error;
        }
      }
      if (!success) {
        throw lastError || new Error("Tất cả các body đều thất bại.");
      }
    } catch (error) {
      console.error("Error booking appointment:", error.response?.data || error.message);
      Alert.alert(
        "Lỗi",
        error.response?.data?.detail ||
          "Không thể đặt lịch hẹn. Vui lòng kiểm tra thông tin hoặc thử lại sau."
      );
    }
  };

  // Hủy lịch hẹn (DELETE API)
  const deleteAppointment = async (appointmentId) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc muốn hủy lịch hẹn này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Hủy",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              if (!token) throw new Error("Token không tồn tại.");
              console.log("Deleting appointment ID:", appointmentId, "with token:", token.substring(0, 10) + "...");
              const response = await authApis(token).delete(endpoints.appointment(appointmentId));
              console.log("Delete API response:", response.status);
              Alert.alert("Thành công", "Hủy lịch hẹn thành công!");
              fetchUserAppointments();
            } catch (error) {
              console.error("Error deleting appointment:", error.response?.data || error.message);
              Alert.alert(
                "Lỗi",
                error.response?.data?.detail ||
                  "Không thể hủy lịch hẹn. Vui lòng thử lại sau."
              );
            }
          },
        },
      ]
    );
  };

  // Hiển thị mỗi mục
  const renderItem = ({ item }) => {
    const isAppointment = showAllAppointments;
    const isUpcoming = isAppointment
      ? item.registered_at && new Date(item.registered_at).getTime() >= new Date().setHours(0, 0, 0, 0)
      : true;

    return (
      <View
        style={[
          styles.itemCard,
          { backgroundColor: isUpcoming ? "#f8dad0" : "#b5d8df" },
        ]}
      >
        <View style={styles.itemInfo}>
          {isAppointment ? (
            <>
              <Text style={[styles.itemText, { fontWeight: "bold" }]}>
                Ngày hẹn tiêm: {item.schedule.date
                  ? new Date(item.schedule.date).toLocaleString("vi-VN")
                  : "Không xác định"}
              </Text>
              <Text style={styles.itemText}>
                Tên vaccine: {item.schedule.vaccine_name || "Không xác định"}
              </Text>
              <Text style={styles.itemText}>
                Loại vaccine: {item.schedule.vaccine_type_name || "Không xác định"}
              </Text>
              <Text style={styles.itemText}>
                Địa điểm tiêm: {item.schedule.site_name || "Không xác định"}
              </Text>
              <Text style={styles.itemText}>
                Trạng thái: {item.is_confirmed ? "Đã xác nhận" : "Đang chờ xác nhận"}
              </Text>
              <Text style={styles.itemText}>
                Trạng thái tiêm: {item.is_inoculated ? "Đã hoàn thành tiêm chủng" : "Chưa hoàn thành"}
              </Text>
              {isUpcoming && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteAppointment(item.id)}
                >
                  <Text style={styles.deleteButtonText}>Hủy lịch hẹn</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.itemText, { fontWeight: "bold" }]}>
                {item.vaccine_name || "Không xác định"}
              </Text>
              <Text style={styles.itemText}>
                Loại: {item.vaccine_type_name || "Không xác định"}
              </Text>
              <Text style={styles.itemText}>
                Ngày: {item.date
                  ? new Date(item.date).toLocaleDateString("vi-VN")
                  : "Không xác định"}
              </Text>
              <Text style={styles.itemText}>
                Địa điểm: {item.site_name || "Không xác định"}
              </Text>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => bookAppointment(item)}
              >
                <Text style={styles.bookButtonText}>Đặt lịch</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch Tiêm Chủng</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={toggleAllAppointments}
        >
          <Text style={styles.toggleButtonText}>
            {showAllAppointments ? "Xem đợt tiêm chủng hiện có" : "Xem lịch hẹn của bạn"}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0c5776" style={styles.loader} />
      ) : (
        <View style={styles.contentContainer}>
          <FlatList
            data={displayedItems}
            renderItem={renderItem}
            keyExtractor={(item) => (showAllAppointments ? item.id : item.id).toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {showAllAppointments
                  ? "Không có lịch hẹn nào."
                  : "Không có lịch tiêm sắp tới."}
              </Text>
            }
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMoreItems}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator size="small" color="#0c5776" style={styles.loader} />
              ) : null
            }
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#6a97a4",
  },
  header: {
    height: 120,
    backgroundColor: "#0c5776",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    alignItems: "center",
    flexDirection: "row",
    zIndex: 1,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  backButton: {
    padding: 10,
    marginTop: 30,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 30,
  },
  placeholder: {
    width: 44,
  },
  toggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toggleButton: {
    backgroundColor: "#d4f0f0",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleButtonText: {
    fontSize: 16,
    color: "#021b42",
    fontWeight: "bold",
  },
  contentContainer: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  itemCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  itemInfo: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: "#021b42",
    marginBottom: 6,
  },
  bookButton: {
    backgroundColor: "#0c5776",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyText: {
    fontSize: 16,
    color: "#021b42",
    textAlign: "center",
    marginTop: 20,
  },
  loader: {
    marginVertical: 20,
  },
  deleteButton: {
    backgroundColor: "#f08486",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default BookingAppointment;