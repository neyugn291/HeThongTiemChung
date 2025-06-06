import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StatusBar, StyleSheet, ActivityIndicator, Alert, Modal } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Searchbar } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";

// Hàm chuyển arraybuffer thành base64
const arrayBufferToBase64 = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const vietnameseMonths = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

const DownloadCertificate = ({ navigation }) => {
  const [vaccinationRecords, setVaccinationRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const itemsPerPage = 4;
  const [q, setQ] = useState("");

  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    fetchVaccinationRecords();
  }, []);

  const fetchVaccinationRecords = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await authApis(token).get(endpoints["recordSearch"]);
      const sortedRecords = response.data.sort(
        (a, b) => new Date(b.injection_date) - new Date(a.injection_date)
      );
      setVaccinationRecords(sortedRecords);
      filterRecords(sortedRecords, q, filterMonth, filterYear, 1);
    } catch (error) {
      console.error("Error fetching vaccination records:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách tiêm chủng.");
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = (records, searchQuery, month, year, pageNum) => {
    let filtered = records;

    if (month || year) {
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.injection_date);
        const recordMonth = (recordDate.getMonth() + 1).toString().padStart(2, "0");
        const recordYear = recordDate.getFullYear().toString();
        return (
          (!month || recordMonth === month) &&
          (!year || recordYear === year)
        );
      });
    }

    // Tìm kiếm theo vaccine_name hoặc vaccine_type_name
    if (searchQuery) {
      filtered = filtered.filter((record) =>
        record.vaccine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.vaccine_type_name && record.vaccine_type_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    const startIndex = (pageNum - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRecords = filtered.slice(startIndex, endIndex);

    setFilteredRecords((prev) =>
      pageNum === 1 ? paginatedRecords : [...prev, ...paginatedRecords]
    );
  };

  const loadMoreRecords = () => {
    if (isLoadingMore || filteredRecords.length >= vaccinationRecords.length) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    filterRecords(vaccinationRecords, q, filterMonth, filterYear, nextPage);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

  // Xử lý áp dụng bộ lọc
  const applyFilter = () => {
    const validation = validateDate(filterMonth, filterYear);
    if (!validation.isValid) {
      Alert.alert("Lỗi", validation.error);
      return;
    }
    setPage(1);
    filterRecords(vaccinationRecords, q, filterMonth, filterYear, 1);
    setIsFilterVisible(false);
  };

  // Xử lý xóa bộ lọc
  const clearFilter = () => {
    setFilterMonth("");
    setFilterYear("");
    setQ(""); // Xóa từ khóa tìm kiếm khi xóa bộ lọc
    setPage(1);
    filterRecords(vaccinationRecords, "", "", "", 1);
    setIsFilterVisible(false);
  };

  const validateDate = (month, year) => {
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (!month && !year) {
      return { isValid: true };
    }

    if (month && (isNaN(monthNum) || monthNum < 1 || monthNum > 12)) {
      return { isValid: false, error: "Tháng phải nằm trong khoảng từ 1 đến 12." };
    }
    if (year && (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear)) {
      return { isValid: false, error: `Năm phải nằm trong khoảng từ 1900 đến ${currentYear}.` };
    }

    return { isValid: true };
  };

  // Xử lý tìm kiếm
  const search = (value) => {
    setQ(value);
    setPage(1);
    filterRecords(vaccinationRecords, value, filterMonth, filterYear, 1);
  };

  const handleDownload = async (recordId) => {
    try {
      setDownloadingId(recordId);
      const fileUri = `${FileSystem.documentDirectory}vaccination_certificate_${recordId}_${Date.now()}.pdf`;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: "Mở hoặc chia sẻ giấy chứng nhận",
        });
        setDownloadingId(null);
        return;
      }

      const token = await AsyncStorage.getItem("token");
      const url = endpoints["certificate"](recordId);
      console.log("Generated URL for download:", url);
      const response = await authApis(token).get(url, {
        responseType: "arraybuffer",
      });

      const base64Data = arrayBufferToBase64(response.data);
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: "Mở hoặc chia sẻ giấy chứng nhận",
        });
      } else {
        Alert.alert(
          "Thông báo",
          "Không thể mở file trực tiếp. File đã được lưu tại:\n" +
          fileUri +
          "\nBạn có thể thử lưu vào iCloud Drive hoặc mở bằng ứng dụng PDF viewer."
        );
      }
    } catch (error) {
      console.error("Error downloading certificate:", error.response ? error.response.data : error.message);
      if (error.response?.status === 404) {
        Alert.alert("Lỗi", `Không tìm thấy bản ghi tiêm chủng với ID ${recordId}.`);
      } else if (error.response?.status === 500) {
        Alert.alert("Lỗi", "Lỗi server, vui lòng thử lại sau hoặc liên hệ admin.");
      } else {
        Alert.alert("Lỗi", "Không thể tải giấy chứng nhận.");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const renderVaccinationRecord = ({ item }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordInfo}>
        <Text style={[styles.recordText, {fontWeight: "bold"}]}>
          {item?.vaccine_name || "Không xác định"}
        </Text>
        <Text style={styles.recordText}>Loại: {item?.vaccine_type_name || "Không xác định"}</Text>
        <Text style={styles.recordText}>Liều số: {item?.dose_number}</Text>
        <Text style={styles.recordText}>
          Ngày tiêm: {new Date(item?.injection_date).toLocaleDateString("vi-VN")}
        </Text>
        <Text style={styles.recordText}>
          Địa điểm: {item?.site_name || "Không xác định"}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={() => handleDownload(item.id)}
        disabled={downloadingId === item.id}
      >
        {downloadingId === item.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons name="download" size={16} color="#fff" style={{ marginRight: 1 }} />
            <Text style={styles.downloadButtonText}>Tải về</Text>
          </View>
        )}
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
        <Text style={styles.headerTitle}>Tải Giấy Chứng Nhận</Text>
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
          placeholder="Nhập tên hoặc loại vaccine"
          onChangeText={search}
          value={q}
          style={styles.searchbar}
          inputStyle={styles.searchbarInput}
          placeholderTextColor="#021b42"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0c5776" style={styles.loader} />
      ) : (
        <View style={styles.contentContainer}>
          <FlatList
            data={filteredRecords}
            renderItem={renderVaccinationRecord}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {q || filterMonth || filterYear
                  ? "Không tìm thấy lịch sử tiêm với bộ lọc này."
                  : "Không có lịch sử tiêm chủng để tải."}
              </Text>
            }
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMoreRecords}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator size="small" color="#0c5776" style={styles.loader} />
              ) : null
            }
          />
        </View>
      )}

      <Modal
        transparent={true}
        visible={isFilterVisible}
        animationType="slide"
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.fixedTitleContainer}>
              <Text style={[styles.fixedTitle, { width: 170 }]}>Tháng</Text>
              <Text style={[styles.fixedTitle, { width: 130 }]}>Năm</Text>
            </View>
            {/* Picker cho chọn tháng và năm */}
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterMonth}
                style={[styles.picker, { width: 150 }]}
                onValueChange={(itemValue) => setFilterMonth(itemValue)}
              >
                <Picker.Item label="Tất cả" value="" />
                {months.map((month, index) => (
                  <Picker.Item key={month} label={vietnameseMonths[index]} value={month} />
                ))}
              </Picker>
              <Picker
                selectedValue={filterYear}
                style={[styles.picker, { width: 140 }]}
                onValueChange={(itemValue) => setFilterYear(itemValue)}
              >
                <Picker.Item label="Tất cả" value="" />
                {years.map((year) => (
                  <Picker.Item key={year} label={year} value={year} />
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
  contentContainer: {
    flex: 1,
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
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  recordCard: {
    position: "relative",
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
  recordInfo: {
    flex: 1,
  },
  recordText: {
    fontSize: 16,
    color: "#021b42",
    marginBottom: 5,
  },
  downloadButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#0c5776",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  downloadButtonText: {
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
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#0c5776",
    paddingVertical: 20,
  },
  fixedTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 80,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f9ccbd",
  },
  fixedTitle: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0c5776",
    borderRadius: 8,
    paddingHorizontal: 30,
  },
  picker: {
    height: 250,
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

export default DownloadCertificate;