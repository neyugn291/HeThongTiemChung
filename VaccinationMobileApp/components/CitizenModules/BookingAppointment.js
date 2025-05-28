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
  Switch,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

const BookingAppointment = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]); // Danh sách hiển thị
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1); // Trang hiện tại
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Trạng thái tải thêm
  const [showPastAppointments, setShowPastAppointments] = useState(false); // Toggle lịch cũ
  const itemsPerPage = 10; // Số bản ghi mỗi trang

  useEffect(() => {
    fetchUserAppointments();
  }, [showPastAppointments]);

  // Lấy danh sách lịch hẹn của người dùng
  const fetchUserAppointments = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await authApis(token).get(endpoints["appointments"]);
      console.log("Appointments API response:", response.data); // Debug
      const sortedAppointments = response.data.sort(
        (a, b) => new Date(b.schedule.date) - new Date(a.schedule.date)
      );
      setAppointments(sortedAppointments);
      filterAppointments(sortedAppointments, 1);
    } catch (error) {
      console.error("Error fetching user appointments:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách lịch hẹn.");
      setAppointments([]);
      setFilteredAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // Lọc và phân trang dữ liệu
  const filterAppointments = (data, pageNum) => {
    let filtered = data;

    // Lọc lịch hẹn đã qua
    if (!showPastAppointments) {
      filtered = filtered.filter(
        (appointment) => new Date(appointment.schedule.date) >= new Date()
      );
    }

    // Phân trang
    const startIndex = (pageNum - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedAppointments = filtered.slice(startIndex, endIndex);

    setFilteredAppointments((prev) =>
      pageNum === 1 ? paginatedAppointments : [...prev, ...paginatedAppointments]
    );
  };

  // Tải thêm khi cuộn đến cuối
  const loadMoreAppointments = () => {
    if (isLoadingMore || filteredAppointments.length >= appointments.length) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    filterAppointments(appointments, nextPage);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

  // Toggle hiển thị lịch hẹn đã qua
  const togglePastAppointments = () => {
    setShowPastAppointments((prev) => !prev);
    setPage(1);
    setFilteredAppointments([]);
  };

  // Điều hướng đến màn hình đặt lịch tiêm
  const navigateToBooking = () => {
    navigation.navigate("InjectionSearch"); // Màn hình đặt lịch
  };

  // Hiển thị mỗi lịch hẹn
  const renderAppointment = ({ item }) => (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentInfo}>
        <Text style={styles.appointmentText}>
          Vaccine: {item.schedule.vaccine_name || "Không xác định"}
        </Text>
        <Text style={styles.appointmentText}>
          Loại: {item.schedule.vaccine_type_name || "Không xác định"}
        </Text>
        <Text style={styles.appointmentText}>
          Ngày: {new Date(item.schedule.date).toLocaleDateString("vi-VN")}
        </Text>
        <Text style={styles.appointmentText}>
          Địa điểm: {item.schedule.site_name || "Không xác định"}
        </Text>
        <Text style={styles.appointmentText}>
          Trạng thái: {item.status === "confirmed" ? "Đã xác nhận" : item.status === "cancelled" ? "Đã hủy" : "Đang chờ"}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch Hẹn Của Tôi</Text>
        <TouchableOpacity style={styles.bookButton} onPress={navigateToBooking}>
          <MaterialCommunityIcons name="calendar-plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Nút bật/tắt lịch hẹn cũ */}
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleText}>Hiển thị lịch hẹn đã qua</Text>
        <Switch
          value={showPastAppointments}
          onValueChange={togglePastAppointments}
          trackColor={{ false: "#767577", true: "#0c5776" }}
          thumbColor={showPastAppointments ? "#f8dad0" : "#f4f3f4"}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0c5776" style={styles.loader} />
      ) : (
        <View style={styles.contentContainer}>
          <FlatList
            data={filteredAppointments}
            renderItem={renderAppointment}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {showPastAppointments
                  ? "Không có lịch hẹn nào."
                  : "Không có lịch hẹn sắp tới."}
              </Text>
            }
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMoreAppointments}
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
    paddingHorizontal: 10,
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
    marginLeft: 5,
  },
  bookButton: {
    padding: 10,
    marginTop: 30,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toggleText: {
    fontSize: 16,
    color: "#021b42",
  },
  contentContainer: {
    flex: 1,
    marginTop: 10,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  appointmentCard: {
    backgroundColor: "#f8dad0",
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentText: {
    fontSize: 16,
    color: "#021b42",
    marginBottom: 5,
  },
  emptyText: {
    fontSize: 16,
    color: "#021b42",
    textAlign: "center",
    marginTop: 20,
  },
  loader: {
    marginTop: 20,
  },
});

export default BookingAppointment;