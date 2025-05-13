import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
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

const InjectionSearch = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [displayedAppointments, setDisplayedAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10; // Số lượng lịch hẹn hiển thị mỗi lần tải

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await authApis(token).get(endpoints["appointments"]);
      const now = new Date();

      // Lọc lịch hẹn sắp tới và sắp xếp theo ngày gần nhất
      const InjectionSearch = response.data
        .filter((appointment) => {
          const appointmentDate = new Date(appointment.appointment_date);
          return (
            appointment.status !== "completed" && // Chỉ lấy lịch hẹn chưa hoàn thành
            appointmentDate >= now // Chỉ lấy lịch hẹn từ hiện tại trở đi
          );
        })
        .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));

      setAppointments(InjectionSearch);
      setFilteredAppointments(InjectionSearch);

      // Hiển thị trang đầu tiên (lazy loading)
      setDisplayedAppointments(InjectionSearch.slice(0, pageSize));
      setPage(1);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách lịch hẹn.");
    } finally {
      setLoading(false);
    }
  };

  // Xử lý tìm kiếm theo tên vaccine
  const handleSearch = (keyword) => {
    setSearchKeyword(keyword);
    if (keyword.trim() === "") {
      setFilteredAppointments(appointments);
    } else {
      const filtered = appointments.filter((appointment) =>
        appointment.vaccine?.name.toLowerCase().includes(keyword.toLowerCase())
      );
      setFilteredAppointments(filtered);
    }
    setPage(1);
    setDisplayedAppointments(filteredAppointments.slice(0, pageSize));
  };

  // Xử lý lazy loading khi cuộn đến cuối danh sách
  const loadMoreAppointments = () => {
    if (displayedAppointments.length >= filteredAppointments.length) return;

    const nextPage = page + 1;
    const newAppointments = filteredAppointments.slice(0, nextPage * pageSize);
    setDisplayedAppointments(newAppointments);
    setPage(nextPage);
  };

  const renderAppointment = ({ item }) => (
    <View style={styles.appointmentCard}>
      <Text style={styles.appointmentText}>
        Vaccine: {item.vaccine?.name || "Không xác định"}
      </Text>
      <Text style={styles.appointmentText}>
        Ngày hẹn: {new Date(item.appointment_date).toLocaleDateString("vi-VN")}
      </Text>
      <Text style={styles.appointmentText}>
        Trạng thái: {item.status === "scheduled" ? "Đã lên lịch" : "Đang chờ"}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch Hẹn Tiêm Sắp Tới</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchKeyword}
          onChangeText={handleSearch}
          placeholder="Tìm kiếm theo tên vaccine..."
          placeholderTextColor="#021b42"
        />
        <MaterialCommunityIcons name="magnify" size={24} color="#021b42" style={styles.searchIcon} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0c5776" style={styles.loader} />
      ) : (
        <FlatList
          data={displayedAppointments}
          renderItem={renderAppointment}
          keyExtractor={(item) => item.id.toString()}
          onEndReached={loadMoreAppointments}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchKeyword
                ? "Không tìm thấy lịch hẹn với từ khóa này."
                : "Không có lịch hẹn sắp tới."}
            </Text>
          }
          contentContainerStyle={styles.listContainer}
        />
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
    height: 50,
    backgroundColor: "#0c5776",
    justifyContent: "flex-start",
    paddingLeft: 10,
    alignItems: "center",
    flexDirection: "row",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  backButton: {
    padding: 10,
    position: "relative",
    top: 30,
    left: 0,
    zIndex: 1,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    position: "relative",
    top: 30,
    left: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 90,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#f8dad0",
    borderWidth: 1,
    borderColor: "#f9ccbd",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: "#021b42",
  },
  searchIcon: {
    marginLeft: 10,
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
  appointmentText: {
    fontSize: 16,
    color: "#021b42",
    marginBottom: 5,
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#021b42",
    textAlign: "center",
    marginTop: 20,
  },
});

export default InjectionSearch;