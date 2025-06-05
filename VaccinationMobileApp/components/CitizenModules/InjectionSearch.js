import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Switch,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";
import { Searchbar } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";

const InjectionSearch = ({ navigation }) => {
  const [schedules, setSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterSite, setFilterSite] = useState("");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [q, setQ] = useState("");
  const [showPastSchedules, setShowPastSchedules] = useState(false);
  const itemsPerPage = 4;

  useEffect(() => {
    fetchSchedules();
  }, [showPastSchedules]);

  // Lấy danh sách lịch tiêm và trích xuất địa điểm
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const endpoint = showPastSchedules
        ? endpoints["allSchedules"] || "/api/schedules/"
        : endpoints["upcomingSchedules"] || "/api/schedules/upcoming/";
      console.log("Fetching schedules from:", endpoint);
      const response = await authApis(token).get(endpoint);
      console.log("Schedules API response:", JSON.stringify(response.data, null, 2));

      // Sắp xếp lịch
      const sortedSchedules = response.data.sort((a, b) =>
        showPastSchedules
          ? new Date(b.date) - new Date(a.date) // Giảm dần: gần nhất trên cùng
          : new Date(a.date) - new Date(b.date) // Tăng dần: gần nhất trên cùng
      );

      // Lọc client-side
      const filteredData = showPastSchedules
        ? sortedSchedules.filter((schedule) => new Date(schedule.date).getTime() < new Date().setHours(0, 0, 0, 0)) // Chỉ lịch cũ
        : sortedSchedules.filter((schedule) => new Date(schedule.date).getTime() >= new Date().setHours(0, 0, 0, 0)); // Chỉ lịch sắp tới

      // Lấy danh sách địa điểm duy nhất
      const uniqueSites = [
        ...new Set(
          sortedSchedules
            .filter((schedule) => schedule.site_name)
            .map((schedule) => schedule.site_name)
        ),
      ].map((name, index) => ({ id: index + 1, name }));
      console.log("Unique sites:", JSON.stringify(uniqueSites));

      setSites(uniqueSites);
      setSchedules(filteredData);
      filterSchedules(filteredData, q, filterSite, 1);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách lịch tiêm.");
      setSchedules([]);
      setFilteredSchedules([]);
      setSites([]);
    } finally {
      setLoading(false);
    }
  };

  // Lọc và phân trang dữ liệu
  const filterSchedules = (data, searchQuery, site, pageNum) => {
    let filtered = data;

    // Lọc theo địa điểm
    if (site) {
      filtered = filtered.filter((schedule) => schedule.site_name === site);
    }

    // Tìm kiếm
    if (searchQuery) {
      filtered = filtered.filter((schedule) =>
        (schedule.vaccine_name &&
          schedule.vaccine_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (schedule.vaccine_type_name &&
          schedule.vaccine_type_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Phân trang
    const startIndex = (pageNum - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSchedules = filtered.slice(startIndex, endIndex);

    setFilteredSchedules((prev) =>
      pageNum === 1 ? paginatedSchedules : [...prev, ...paginatedSchedules]
    );
  };

  // Tải thêm lịch
  const loadMore = () => {
    if (isLoadingMore || filteredSchedules.length >= schedules.length) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    filterSchedules(schedules, q, filterSite, nextPage);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

  // Xử lý tìm kiếm
  const search = (value) => {
    setQ(value);
    setPage(1);
    filterSchedules(schedules, value, filterSite, 1);
  };

  // Áp dụng bộ lọc
  const applyFilter = () => {
    setPage(1);
    filterSchedules(schedules, q, filterSite, 1);
    setIsFilterVisible(false);
  };

  // Xóa bộ lọc
  const clearFilter = () => {
    setFilterSite("");
    setQ("");
    setPage(1);
    filterSchedules(schedules, "", "", 1);
    setIsFilterVisible(false);
  };

  // Toggle lịch cũ
  const togglePastSchedules = () => {
    setShowPastSchedules((prev) => !prev);
    setPage(1);
    setFilteredSchedules([]);
  };

  // Hiển thị mỗi lịch tiêm
  const renderSchedule = ({ item }) => (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleInfo}>
        <Text style={[styles.scheduleText, { fontWeight: "bold" }]}>
          {item.vaccine_name || "Không xác định"}
        </Text>
        <Text style={styles.scheduleText}>
          Loại: {item.vaccine_type_name || "Không xác định"}
        </Text>
        <Text style={styles.scheduleText}>
          Ngày: {new Date(item.date).toLocaleDateString("vi-VN")}
        </Text>
        <Text style={styles.scheduleText}>
          Địa điểm: {item.site_name || "Không xác định"}
        </Text>
        <Text style={styles.scheduleText}>Số lượng: {item.slot_count}</Text>
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
        <Text style={styles.headerTitle}>Tra Cứu Lịch Tiêm</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setIsFilterVisible(true)}
        >
          <MaterialCommunityIcons name="filter" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Thanh tìm kiếm */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Tìm kiếm theo tên hoặc loại vaccine"
          onChangeText={search}
          value={q}
          style={styles.searchbar}
          inputStyle={styles.searchbarInput}
          placeholderTextColor="#021b42"
        />
      </View>

      {/* Nút bật/tắt lịch cũ */}
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleText}>Hiển thị lịch tiêm cũ</Text>
        <Switch
          value={showPastSchedules}
          onValueChange={togglePastSchedules}
          trackColor={{ false: "#767577", true: "#0c5776" }}
          thumbColor={showPastSchedules ? "#f8dad0" : "#f4f3f4"}
        />
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
              <Text style={styles.emptyText}>
                {q || filterSite
                  ? "Không tìm thấy lịch tiêm với bộ lọc này."
                  : "Không có lịch tiêm."}
              </Text>
            }
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator size="small" color="#0c5776" style={styles.loader} />
              ) : null
            }
          />
        </View>
      )}

      {/* Modal cho bộ lọc địa điểm */}
      <Modal
        transparent={true}
        visible={isFilterVisible}
        animationType="slide"
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.fixedTitle}>Địa điểm</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterSite}
                style={styles.picker}
                onValueChange={(itemValue) => setFilterSite(itemValue)}
              >
                <Picker.Item label="Tất cả" value="" />
                {sites.map((site) => (
                  <Picker.Item key={site.id} label={site.name} value={site.name} />
                ))}
              </Picker>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={clearFilter}
              >
                <Text style={styles.modalButtonText}>Xóa bộ lọc</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.doneButton]}
                onPress={applyFilter}
              >
                <Text style={styles.modalButtonText}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  filterButton: {
    padding: 10,
    marginTop: 30,
  },
  searchContainer: {
    marginTop: 20,
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#021b42",
    paddingBottom: 20,
  },
  searchbar: {
    backgroundColor: "#e0f2fe",
    borderRadius: 8,
  },
  searchbarInput: {
    fontSize: 16,
    color: "#021b42",
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
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  scheduleCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8dad0", // Màu chung cho tất cả lịch
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
  emptyText: {
    fontSize: 16,
    color: "#021b42",
    textAlign: "center",
    marginTop: 20,
  },
  loader: {
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#0c5776",
    paddingVertical: 20,
  },
  fixedTitle: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    paddingBottom: 20,
  },
  pickerContainer: {
    backgroundColor: "#0c5776",
    borderRadius: 8,
    paddingHorizontal: 30,
  },
  picker: {
    height: 150,
    color: "#021b42",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingHorizontal: 30,
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f8dad0",
    marginRight: 10,
  },
  doneButton: {
    backgroundColor: "#f8dad0",
  },
  modalButtonText: {
    color: "#021b42",
    fontSize: 16,
  },
});

export default InjectionSearch;