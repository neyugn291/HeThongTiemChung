import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

const EditHealthNote = ({ navigation }) => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState({});
  const [notes, setNotes] = useState({}); // State để lưu ghi chú cho từng record

  const currentDate = new Date("2025-06-04T02:33:00+07:00"); // Thời gian hiện tại: 02:33 AM +07, 04/06/2025

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");

      console.log("Token from AsyncStorage:", token.substring(0, 10) + "...");
      const url = endpoints["recordSearch"];
      console.log("Fetching records from:", url);

      const response = await authApis(token).get(url);

      if (response.status !== 200) {
        throw new Error(`Server returned status ${response.status}: ${JSON.stringify(response.data)}`);
      }

      console.log("Records API response:", JSON.stringify(response.data, null, 2));

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error("Dữ liệu trả về không phải là danh sách hoặc rỗng.");
      }

      const recordsWithNotes = response.data.map((item) => ({
        ...item,
        health_note: item.health_note || "",
      }));
      setRecords(recordsWithNotes);
      setFilteredRecords(recordsWithNotes);

      // Khởi tạo notes từ health_note của các record
      const initialNotes = recordsWithNotes.reduce((acc, item) => {
        acc[item.id] = item.health_note || "";
        return acc;
      }, {});
      setNotes(initialNotes);
    } catch (error) {
      console.error("Error fetching records:", error.message, error.response?.data, error.response?.status);
      let errorMessage = `Không thể tải danh sách hồ sơ. Chi tiết: ${error.message}`;
      if (error.message.includes("Network Error")) {
        errorMessage = "Lỗi mạng. Vui lòng kiểm tra kết nối và đảm bảo server đang chạy.";
      } else if (error.response?.status === 401) {
        errorMessage = "Unauthorized: Token không hợp lệ. Vui lòng đăng nhập lại.";
      } else if (error.response?.status === 403) {
        errorMessage = "Forbidden: Bạn không có quyền truy cập.";
      }
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      const filtered = records.filter(
        (item) =>
          item.id?.toString().includes(text) ||
          (item.user?.first_name || "").toLowerCase().includes(text.toLowerCase()) ||
          (item.user?.last_name || "").toLowerCase().includes(text.toLowerCase())
      );
      setFilteredRecords(filtered);
    } else {
      setFilteredRecords(records);
    }
  };

  const updateHealthNote = async (recordId, currentNote) => {
    if (!currentNote.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập hoặc giữ ghi chú!");
      return;
    }

    setSaving((prev) => ({ ...prev, [recordId]: true }));

    Alert.alert("Xác nhận", "Bạn có muốn cập nhật ghi chú này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Lưu",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            if (!token) throw new Error("Token không tồn tại.");

            const endpoint = endpoints.records(recordId);
            console.log("Updating health note with endpoint:", endpoint);

            // Kiểm tra thêm dữ liệu yêu cầu từ backend (nếu cần)
            const payload = { health_note: currentNote };
            // Nếu backend yêu cầu thêm thông tin (ví dụ: vaccination_id), thêm vào payload
            // Ví dụ: const record = records.find((r) => r.id === recordId);
            // if (record?.vaccination_id) payload.vaccination_id = record.vaccination_id;

            const response = await authApis(token).patch(endpoint, payload);

            if (response.status !== 200) {
              throw new Error(`Server returned status ${response.status}: ${JSON.stringify(response.data)}`);
            }

            console.log("Update health note response:", JSON.stringify(response.data, null, 2));

            setNotes((prev) => ({ ...prev, [recordId]: currentNote }));
            setRecords((prev) =>
              prev.map((item) =>
                item.id === recordId ? { ...item, health_note: currentNote } : item
              )
            );
            setFilteredRecords((prev) =>
              prev.map((item) =>
                item.id === recordId ? { ...item, health_note: currentNote } : item
              )
            );
            Alert.alert("Thành công", "Ghi chú đã được cập nhật!");
          } catch (error) {
            console.error("Error updating health note:", error.response?.data || error.message);
            let errorMessage = "Không thể cập nhật ghi chú. Vui lòng thử lại.";
            if (error.message.includes("Network Error")) {
              errorMessage = "Lỗi mạng. Vui lòng kiểm tra kết nối và đảm bảo server đang chạy.";
            } else if (error.response?.status === 401) {
              errorMessage = "Unauthorized: Token không hợp lệ. Vui lòng đăng nhập lại.";
            } else if (error.response?.status === 403) {
              errorMessage = "Forbidden: Bạn không có quyền cập nhật.";
            } else if (error.response?.status === 404) {
              errorMessage = error.response.data?.message || "Bản ghi không tồn tại.";
            } else if (error.response?.status === 400) {
              errorMessage = error.response.data?.message || "Dữ liệu không hợp lệ.";
            }
            Alert.alert("Lỗi", errorMessage);
          } finally {
            setSaving((prev) => ({ ...prev, [recordId]: false }));
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const noteText = notes[item.id] || "";
    const recordDate = item.injection_date || item.schedule?.date;

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
            Ngày: {recordDate ? new Date(recordDate).toLocaleDateString("vi-VN") : "Không xác định"}
          </Text>
          <Text style={styles.itemText}>
            Vaccine: {item.vaccine_name || "Không xác định"}
          </Text>
          <TextInput
            style={styles.noteInput}
            placeholder={noteText ? "" : "Chưa có ghi chú"}
            value={noteText}
            onChangeText={(text) => setNotes((prev) => ({ ...prev, [item.id]: text }))}
            multiline
          />
          <TouchableOpacity
            style={styles.addNoteButton}
            onPress={() => updateHealthNote(item.id, noteText)}
            disabled={saving[item.id]}
          >
            {saving[item.id] ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.addNoteText}>Lưu ghi chú</Text>
            )}
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
        <Text style={styles.headerTitle}>Thêm ghi chú sức khỏe</Text>
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
          data={filteredRecords}
          renderItem={renderItem}
          keyExtractor={(item) => item.id?.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>Không có hồ sơ nào.</Text>}
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
  noteInput: {
    height: 80,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 4,
    marginVertical: 8,
    padding: 8,
    textAlignVertical: "top",
    backgroundColor: "#fff",
  },
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

export default EditHealthNote;