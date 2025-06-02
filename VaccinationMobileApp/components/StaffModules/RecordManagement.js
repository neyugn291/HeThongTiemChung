import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

const RecordManagement = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const currentDate = new Date("2025-06-02T18:20:00+07:00"); // Thời gian hiện tại: 06:20 PM +07, 02/06/2025

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");

      const response = await authApis(token).get(endpoints["appointment"]());
      console.log("Appointments API response:", JSON.stringify(response.data, null, 2));

      setAppointments(response.data);
      setFilteredAppointments(response.data);
    } catch (error) {
      console.error("Error fetching appointments:", error.message);
      Alert.alert("Lỗi", "Không thể tải danh sách hồ sơ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      const filtered = appointments.filter((item) =>
        item.id.toString().includes(text) ||
        (item.user?.first_name || "").toLowerCase().includes(text.toLowerCase()) ||
        (item.user?.last_name || "").toLowerCase().includes(text.toLowerCase())
      );
      setFilteredAppointments(filtered);
    } else {
      setFilteredAppointments(appointments);
    }
  };

  const toggleStatus = async (appointmentId, field, currentValue) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");

      console.log("Token used:", token.substring(0, 10) + "...");
      const endpoint = endpoints["appointment"](appointmentId); // Sử dụng endpoint với ID
      console.log("Updating status with endpoint:", endpoint);
      const response = await authApis(token).patch(endpoint, {
        [field]: !currentValue,
      });
      console.log(`${field} updated response:`, JSON.stringify(response.data, null, 2));

      setAppointments((prev) =>
        prev.map((item) =>
          item.id === appointmentId ? { ...item, [field]: !currentValue } : item
        )
      );
      setFilteredAppointments((prev) =>
        prev.map((item) =>
          item.id === appointmentId ? { ...item, [field]: !currentValue } : item
        )
      );
      Alert.alert("Thành công", `Đã cập nhật ${field === "is_confirmed" ? "xác nhận" : "hoàn thành"}!`);
    } catch (error) {
      console.error(`Error updating ${field}:`, error.response?.data || error.message);
      Alert.alert(
        "Lỗi",
        error.response?.data?.detail || `Không thể cập nhật ${field === "is_confirmed" ? "xác nhận" : "hoàn thành"}.`
      );
    }
  };

  const addHealthNote = async (appointmentId) => {
    // Placeholder: Thêm logic gọi API để thêm ghi chú
    Alert.alert("Thêm ghi chú", "Chức năng đang được phát triển!");
    console.log("Add health note for appointment ID:", appointmentId);
    // Thêm endpoint khi backend cung cấp: const endpoint = endpoints["addHealthNote"](appointmentId);
    // const response = await authApis(token).post(endpoint, { note: "Ghi chú mới" });
  };

  const renderItem = ({ item }) => {
    const appointmentDate = item.schedule?.date || item.date;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemText, { fontWeight: "bold" }]}>
            ID: {item.id}
          </Text>
          <Text style={styles.itemText}>
            Tên: {item.user?.first_name || "Không xác định"} {item.user?.last_name || ""}
          </Text>
          <Text style={styles.itemText}>
            Ngày: {appointmentDate ? new Date(appointmentDate).toLocaleDateString("vi-VN") : "Không xác định"}
          </Text>
          <Text style={styles.itemText}>
            Vaccine: {item.schedule?.vaccine_name || "Không xác định"}
          </Text>
          <View style={styles.statusToggle}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>Xác nhận:</Text>
              <Switch
                value={item.is_confirmed || false}
                onValueChange={() => toggleStatus(item.id, "is_confirmed", item.is_confirmed || false)}
                trackColor={{ false: "#767577", true: "#0c5776" }}
                thumbColor={item.is_confirmed ? "#f8dad0" : "#f4f3f4"}
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>Hoàn thành:</Text>
              <Switch
                value={item.is_inoculated || false}
                onValueChange={() => toggleStatus(item.id, "is_inoculated", item.is_inoculated || false)}
                trackColor={{ false: "#767577", true: "#0c5776" }}
                thumbColor={item.is_inoculated ? "#f8dad0" : "#f4f3f4"}
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.addNoteButton}
            onPress={() => addHealthNote(item.id)}
          >
            <Text style={styles.addNoteText}>Thêm ghi chú</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý hồ sơ</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#021b42" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo ID hoặc tên..."
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0c5776" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredAppointments}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Không có hồ sơ nào.</Text>
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#6a97a4" },
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
  backButton: { padding: 10, marginTop: 30 },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 30,
  },
  placeholder: { width: 44 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 10,
    elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: "#021b42",
  },
  listContainer: { paddingBottom: 20 },
  itemCard: {
    borderRadius: 8,
    padding: 16,
    margin: 8,
    backgroundColor: "#f8dad0",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  itemInfo: { flex: 1 },
  itemText: { fontSize: 16, color: "#021b42", marginBottom: 6 },
  statusToggle: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  toggleRow: { flexDirection: "row", alignItems: "center" },
  toggleText: { fontSize: 16, color: "#021b42", marginRight: 8 },
  addNoteButton: {
    backgroundColor: "#0c5776",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  addNoteText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  emptyText: { fontSize: 16, color: "#021b42", textAlign: "center", marginTop: 20 },
  loader: { marginVertical: 20 },
});

export default RecordManagement;