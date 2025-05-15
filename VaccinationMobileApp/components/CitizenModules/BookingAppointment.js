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
  const [filteredSchedules, setFilteredSchedules] = useState([]); // Danh sách hiển thị
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1); // Trang hiện tại
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Trạng thái tải thêm
  const itemsPerPage = 10; // Số bản ghi mỗi trang

  useEffect(() => {
    fetchUpcomingSchedules();
  }, []);

  // Lấy danh sách lịch tiêm sắp tới
  const fetchUpcomingSchedules = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await authApis(token).get(endpoints["upcomingSchedules"]);
      setSchedules(response.data);
      filterSchedules(response.data, 1); // Tải trang 1
    } catch (error) {
      console.error("Error fetching upcoming schedules:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách lịch tiêm.");
    } finally {
      setLoading(false);
    }
  };

  // Phân trang dữ liệu
  const filterSchedules = (data, pageNum) => {
    const startIndex = (pageNum - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSchedules = data.slice(startIndex, endIndex);

    setFilteredSchedules((prev) =>
      pageNum === 1 ? paginatedSchedules : [...prev, ...paginatedSchedules]
    );
  };

  // Tải thêm khi cuộn đến cuối
  const loadMoreSchedules = () => {
    if (isLoadingMore || filteredSchedules.length >= schedules.length) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    filterSchedules(schedules, nextPage);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

  // Đặt lịch hẹn
  const bookAppointment = async (scheduleId) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await authApis(token).post(endpoints["appointments"], {
        schedule: scheduleId,
      });
      Alert.alert("Thành công", "Đặt lịch hẹn thành công!");
      navigation.goBack();
    } catch (error) {
      console.error("Error booking appointment:", error);
      Alert.alert("Lỗi", "Không thể đặt lịch hẹn.");
    } finally {
      setLoading(false);
    }
  };

  const renderSchedule = ({ item }) => (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleInfo}>
        <Text style={styles.scheduleText}>
          Vaccine: {item.vaccine_name || "Không xác định"}
        </Text>
        <Text style={styles.scheduleText}>Ngày: {new Date(item.date).toLocaleDateString("vi-VN")}</Text>
        <Text style={styles.scheduleText}>Địa điểm: {item.site_name || "Không xác định"}</Text>
        <Text style={styles.scheduleText}>Số lượng: {item.slot_count}</Text>
      </View>
      <TouchableOpacity
        style={styles.bookButton}
        onPress={() => bookAppointment(item.id)}
        disabled={item.slot_count === 0 || loading}
      >
        <Text style={styles.bookButtonText}>
          {item.slot_count === 0 ? "Hết chỗ" : "Đặt Lịch"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đặt Lịch Tiêm</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0c5776" style={styles.loader} />
      ) : (
        <View style={styles.contentContainer}>
          <FlatList
            data={filteredSchedules}
            renderItem={renderSchedule}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Không có lịch tiêm sắp tới.</Text>
            }
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMoreSchedules}
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
  placeholder: {
    width: 44, // Giữ chỗ để cân đối header
  },
  contentContainer: {
    flex: 1,
    marginTop: 20,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  scheduleCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8dad0",
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleText: {
    fontSize: 16,
    color: "#021b42",
    marginBottom: 5,
  },
  bookButton: {
    backgroundColor: "#0c5776",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
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
    marginTop: 20,
  },
});

export default BookingAppointment;