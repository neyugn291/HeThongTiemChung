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

  const currentDate = new Date("2025-06-02T18:52:00+07:00"); // Thời gian hiện tại: 06:52 PM +07, 02/06/2025

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");

      const response = await authApis(token).get(endpoints["recordSearch"]);
      console.log("Records API response:", JSON.stringify(response.data, null, 2));

      // Giả định mỗi record có healthnote
      const recordsWithNotes = response.data.map((item) => ({
        ...item,
        healthnote: item.healthnote || "Chưa có ghi chú", // Giá trị mặc định nếu không có
      }));
      setRecords(recordsWithNotes);
      setFilteredRecords(recordsWithNotes);
    } catch (error) {
      console.error("Error fetching records:", error.message);
      Alert.alert("Lỗi", "Không thể tải danh sách hồ sơ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      const filtered = records.filter((item) =>
        item.id.toString().includes(text) ||
        (item.user?.first_name || "").toLowerCase().includes(text.toLowerCase()) ||
        (item.user?.last_name || "").toLowerCase().includes(text.toLowerCase())
      );
      setFilteredRecords(filtered);
    } else {
      setFilteredRecords(records);
    }
  };

  const updateHealthNote = async (recordId, currentNote) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại.");

      if (!currentNote.trim()) {
        Alert.alert("Lỗi", "Vui lòng nhập hoặc giữ ghi chú!");
        return;
      }

      const endpoint = endpoints["records"](recordId);
      console.log("Updating health note with endpoint:", endpoint);
      const response = await authApis(token).patch(endpoint, { healthnote: currentNote });
      console.log("Update health note response:", JSON.stringify(response.data, null, 2));

      setRecords((prev) =>
        prev.map((item) =>
          item.id === recordId ? { ...item, healthnote: currentNote } : item
        )
      );
      setFilteredRecords((prev) =>
        prev.map((item) =>
          item.id === recordId ? { ...item, healthnote: currentNote } : item
        )
      );
      Alert.alert("Thành công", "Ghi chú đã được cập nhật!");
    } catch (error) {
      console.error("Error updating health note:", error.response?.data || error.message);
      Alert.alert(
        "Lỗi",
        error.response?.data?.detail || "Không thể cập nhật ghi chú. Vui lòng thử lại."
      );
    }
  };

  const renderItem = ({ item }) => {
    const [noteText, setNoteText] = useState(item.healthnote || "Chưa có ghi chú");
    const recordDate = item.date || item.schedule?.date;

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
          <TextInput
            style={styles.noteInput}
            placeholder="Nhập hoặc sửa ghi chú sức khỏe..."
            value={noteText}
            onChangeText={setNoteText}
            multiline
          />
          <TouchableOpacity
            style={styles.addNoteButton}
            onPress={() => updateHealthNote(item.id, noteText)}
          >
            <Text style={styles.addNoteText}>Lưu ghi chú</Text>
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
  },
  addNoteText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  emptyText: { fontSize: 16, color: "#021b42", textAlign: "center", marginTop: 20 },
  loader: { marginVertical: 20 },
});

export default EditHealthNote;