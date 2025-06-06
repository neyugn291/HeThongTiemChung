import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StatusBar, StyleSheet, Switch, Alert, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

const Reminders = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  const currentDate = new Date();

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");

      const appointmentEndpoint = endpoints["appointment"]();
      if (typeof appointmentEndpoint !== "string") {
        throw new Error("Endpoint 'appointment' không trả về chuỗi hợp lệ.");
      }

      const response = await authApis(token).get(appointmentEndpoint);
      console.log("Appointments API response:", JSON.stringify(response.data, null, 2));

      // Lọc các lịch hẹn: is_confirmed = true và ngày trong tương lai
      const upcomingAppointments = response.data
        .filter((appointment) => {
          try {
            const appointmentDate = appointment.schedule?.date || appointment.date;
            if (!appointmentDate) {
              console.warn("Missing date in appointment:", appointment);
              return false;
            }
            return (
              appointment.is_confirmed === true &&
              new Date(appointmentDate) >= currentDate
            );
          } catch (e) {
            console.warn("Invalid appointment data:", appointment, e);
            return false;
          }
        })
        .map((appointment) => ({
          ...appointment,
          reminder_enabled: appointment.reminder_enabled || false,
        }))
        .sort((a, b) => {
          const dateA = new Date(a.schedule?.date || a.date);
          const dateB = new Date(b.schedule?.date || b.date);
          return dateA - dateB;
        });

      console.log(
        "Filtered upcoming appointments:",
        upcomingAppointments.map((item) => ({
          id: item.id,
          date: item.schedule?.date || item.date,
          is_confirmed: item.is_confirmed,
          reminder_enabled: item.reminder_enabled,
        }))
      );

      setAppointments(upcomingAppointments);
    } catch (error) {
      console.error("Error fetching appointments:", error.message || error);
      Alert.alert("Lỗi", "Không thể tải danh sách lịch hẹn. Vui lòng kiểm tra kết nối hoặc đăng nhập lại.");
    } finally {
      setLoading(false);
    }
  };

  const toggleReminder = async (appointmentId, currentState) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");

      console.log("Token used:", token.substring(0, 10) + "...");
      const toggleEndpoint = endpoints["toggleReminder"](appointmentId);
      console.log("Calling toggleReminder with endpoint:", toggleEndpoint);
      const response = await authApis(token).patch(toggleEndpoint, {
        reminder_enabled: !currentState,
      });
      console.log("Toggle reminder response:", JSON.stringify(response.data, null, 2));

      setAppointments((prevAppointments) =>
        prevAppointments.map((appointment) =>
          appointment.id === appointmentId
            ? { ...appointment, reminder_enabled: !currentState }
            : appointment
        )
      );
      Alert.alert("Thành công", `Đã ${!currentState ? "bật" : "tắt"} nhắc nhở!`);
    } catch (error) {
      console.error("Error toggling reminder:", error.response?.data || error.message);
      Alert.alert(
        "Lỗi",
        error.response?.data?.detail || "Không thể thay đổi trạng thái nhắc nhở. Vui lòng thử lại."
      );
    }
  };

  const renderItem = ({ item }) => {
    const appointmentDate = item.schedule?.date || item.date;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemText, { fontWeight: "bold" }]}>
            {item.schedule?.vaccine_name || item.vaccine_name || "Không xác định"}
          </Text>
          <Text style={styles.itemText}>
            Loại: {item.schedule?.vaccine_type_name || item.vaccine_type_name || "Không xác định"}
          </Text>
          <Text style={styles.itemText}>
            Ngày: {appointmentDate
              ? new Date(appointmentDate).toLocaleDateString("vi-VN")
              : "Không xác định"}
          </Text>
          <Text style={styles.itemText}>
            Địa điểm: {item.schedule?.site_name || item.site_name || "Không xác định"}
          </Text>
          <View style={styles.reminderToggle}>
            <Text style={styles.toggleText}>
              Nhắc nhở qua email: {item.reminder_enabled ? "Bật" : "Tắt"}
            </Text>
            <Switch
              value={item.reminder_enabled}
              onValueChange={() => toggleReminder(item.id, item.reminder_enabled)}
              trackColor={{ false: "#767577", true: "#0c5776" }}
              thumbColor={item.reminder_enabled ? "#f8dad0" : "#f4f3f4"}
            />
          </View>
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
        <Text style={styles.headerTitle}>Cài đặt nhắc nhở</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0c5776" style={styles.loader} />
      ) : (
        <View style={styles.contentContainer}>
          <FlatList
            data={appointments}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Không có lịch hẹn sắp tới đã xác nhận.</Text>
            }
            contentContainerStyle={styles.listContainer}
          />
        </View>
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
  contentContainer: { flex: 1 },
  listContainer: { padding: 16, paddingBottom: 20 },
  itemCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#f8dad0",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  itemInfo: { flex: 1 },
  itemText: { fontSize: 16, color: "#021b42", marginBottom: 6 },
  reminderToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  toggleText: { fontSize: 16, color: "#021b42" },
  emptyText: { fontSize: 16, color: "#021b42", textAlign: "center", marginTop: 20 },
  loader: { marginVertical: 20 },
});

export default Reminders;