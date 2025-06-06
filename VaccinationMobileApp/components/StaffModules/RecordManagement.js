import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StatusBar, StyleSheet, Switch, Alert, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

const RecordManagement = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [displayedAppointments, setDisplayedAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 4;

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");

      console.log("Token from AsyncStorage:", token.substring(0, 10) + "...");

      const endpoint = endpoints["allAppointment"];
      if (!endpoint) throw new Error("Endpoint 'allAppointment' không được định nghĩa.");
      console.log("Fetching appointments from endpoint:", endpoint);

      const response = await authApis(token).get(endpoint);

      if (response.status !== 200) {
        throw new Error(`Server returned status ${response.status}: ${JSON.stringify(response.data)}`);
      }

      console.log("Appointments API response:", JSON.stringify(response.data, null, 2));

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error("Dữ liệu trả về không phải là danh sách hoặc rỗng.");
      }

      setAppointments(response.data);
      setFilteredAppointments(response.data);
      setDisplayedAppointments(response.data.slice(0, pageSize));
      setPage(1);
    } catch (error) {
      console.error("Error fetching appointments:", error.message, error.response?.data, error.response?.status);
      let errorMessage = `Không thể tải danh sách cuộc hẹn. Chi tiết: ${error.message}`;
      if (error.response?.status === 401) {
        errorMessage = "Unauthorized: Token không hợp lệ hoặc không có quyền staff. Vui lòng đăng nhập lại.";
      } else if (error.response?.status === 403) {
        errorMessage = "Forbidden: Bạn không có quyền truy cập với vai trò staff.";
      }
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      const filtered = appointments.filter((item) =>
        item.id?.toString().includes(text) ||
        (item.user_name || "").toLowerCase().includes(text.toLowerCase())
      );
      setFilteredAppointments(filtered);
      setDisplayedAppointments(filtered.slice(0, pageSize)); // Hiển thị trang đầu tiên sau tìm kiếm
      setPage(1);
    } else {
      setFilteredAppointments(appointments);
      setDisplayedAppointments(appointments.slice(0, pageSize)); // Hiển thị trang đầu tiên khi xóa tìm kiếm
      setPage(1);
    }
  };

  const loadMoreAppointments = () => {
    if (displayedAppointments.length >= filteredAppointments.length) return;

    const nextPage = page + 1;
    const newAppointments = filteredAppointments.slice(0, nextPage * pageSize);
    setDisplayedAppointments(newAppointments);
    setPage(nextPage);

    console.log("loadMoreAppointments - New page:", nextPage);
    console.log("loadMoreAppointments - New displayed appointments:", newAppointments.length);
  };

  const toggleStatus = async (appointmentId, field, currentValue) => {
    Alert.alert(
      "Xác nhận",
      `Bạn có muốn ${currentValue ? "tắt" : "bật"} trạng thái ${field === "is_confirmed" ? "xác nhận" : "hoàn thành"}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              if (!token) throw new Error("Token không tồn tại.");

              const endpoint =
                field === "is_confirmed"
                  ? endpoints.confirmAppointment(appointmentId)
                  : endpoints.inoculateAppointment(appointmentId);
              const body =
                field === "is_confirmed"
                  ? { is_confirmed: !currentValue }
                  : { is_inoculated: !currentValue };
              console.log(`Updating ${field} with endpoint:`, endpoint, "Body:", body);

              const response = await authApis(token).patch(endpoint, body);
              if (response.status !== 200) {
                throw new Error(`Server returned status ${response.status}: ${JSON.stringify(response.data)}`);
              }

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
              setDisplayedAppointments((prev) =>
                prev.map((item) =>
                  item.id === appointmentId ? { ...item, [field]: !currentValue } : item
                )
              );
              Alert.alert("Thành công", `Đã cập nhật trạng thái ${field === "is_confirmed" ? "xác nhận" : "hoàn thành"}!`);
            } catch (error) {
              console.error(`Error updating ${field}:`, error.response?.data || error.message);
              let errorMessage = `Không thể cập nhật trạng thái ${field === "is_confirmed" ? "xác nhận" : "hoàn thành"}.`;
              if (error.response?.status === 401) {
                errorMessage = "Unauthorized: Token không hợp lệ. Vui lòng đăng nhập lại.";
              } else if (error.response?.status === 403) {
                errorMessage = "Forbidden: Bạn không có quyền cập nhật.";
              } else if (error.response?.status === 404) {
                errorMessage = "Appointment không tồn tại.";
              }
              Alert.alert("Lỗi", errorMessage);
            }
          },
        },
      ]
    );
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
            Tài khoản người tiêm: {item?.user_name || "Không xác định"}
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
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (displayedAppointments.length >= filteredAppointments.length) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#0c5776" />
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
        <Text style={styles.headerTitle}>Quản lý cuộc hẹn</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#021b42" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Nhập ID hồ sơ hoặc tên người dùng"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0c5776" style={styles.loader} />
      ) : (
        <FlatList
          data={displayedAppointments}
          renderItem={renderItem}
          keyExtractor={(item) => item.id?.toString()}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Không có cuộc hẹn nào.</Text>
          }
          contentContainerStyle={styles.listContainer}
          onEndReached={loadMoreAppointments}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
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
  listContainer: { paddingBottom: 20, paddingHorizontal: 12 },
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
  emptyText: { fontSize: 16, color: "#021b42", textAlign: "center", marginTop: 20 },
  loader: { marginVertical: 20 },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
});

export default RecordManagement;