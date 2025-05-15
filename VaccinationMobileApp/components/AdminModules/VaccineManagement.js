import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";
import { Picker } from "@react-native-picker/picker";

const VaccineManagement = ({ navigation }) => {
  const [vaccines, setVaccines] = useState([]);
  const [filteredVaccines, setFilteredVaccines] = useState([]);
  const [displayedVaccines, setDisplayedVaccines] = useState([]); // Danh sách hiển thị
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [newVaccineName, setNewVaccineName] = useState("");
  const [newVaccineType, setNewVaccineType] = useState("");
  const [editingVaccine, setEditingVaccine] = useState(null);
  const [page, setPage] = useState(1); // Trang hiện tại
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Trạng thái tải thêm
  const itemsPerPage = 10; // Số bản ghi mỗi trang

  const vaccineTypes = ["Ngừa bệnh", "Tăng cường"]; // Giả lập danh sách loại vaccine

  useEffect(() => {
    fetchVaccines();
  }, []);

  // Lấy danh sách vaccine
  const fetchVaccines = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await authApis(token).get(endpoints["vaccines"]);
      const sortedVaccines = response.data.sort((a, b) => a.name.localeCompare(b.name));
      setVaccines(sortedVaccines);
      filterVaccines(sortedVaccines, searchQuery, filterType, 1);
    } catch (error) {
      console.error("Error fetching vaccines:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách vaccine.");
    } finally {
      setLoading(false);
    }
  };

  // Lọc vaccine theo tên và loại với lazy loading
  const filterVaccines = (vaccines, query, type, pageNum) => {
    let filtered = vaccines;

    if (query) {
      filtered = filtered.filter((vaccine) =>
        vaccine.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (type) {
      filtered = filtered.filter((vaccine) => vaccine.type === type);
    }

    setFilteredVaccines(filtered);

    const startIndex = (pageNum - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedVaccines = filtered.slice(startIndex, endIndex);

    setDisplayedVaccines((prev) =>
      pageNum === 1 ? paginatedVaccines : [...prev, ...paginatedVaccines]
    );
  };

  // Tải thêm khi cuộn đến cuối
  const loadMoreVaccines = () => {
    if (isLoadingMore || displayedVaccines.length >= filteredVaccines.length) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    filterVaccines(filteredVaccines, searchQuery, filterType, nextPage);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

  // Tìm kiếm vaccine
  const handleSearch = (query) => {
    setSearchQuery(query);
    setPage(1);
    filterVaccines(vaccines, query, filterType, 1);
  };

  // Áp dụng bộ lọc
  const applyFilter = () => {
    setPage(1);
    filterVaccines(vaccines, searchQuery, filterType, 1);
    setIsFilterVisible(false);
  };

  // Xóa bộ lọc
  const clearFilter = () => {
    setFilterType("");
    setPage(1);
    filterVaccines(vaccines, searchQuery, "", 1);
    setIsFilterVisible(false);
  };

  // Thêm vaccine mới
  const addVaccine = async () => {
    if (!newVaccineName || !newVaccineType) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin vaccine.");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await authApis(token).post(endpoints["vaccines"], {
        name: newVaccineName,
        type: newVaccineType,
      });
      const updatedVaccines = [...vaccines, response.data].sort((a, b) => a.name.localeCompare(b.name));
      setVaccines(updatedVaccines);
      filterVaccines(updatedVaccines, searchQuery, filterType, 1);
      setNewVaccineName("");
      setNewVaccineType("");
      setIsAddModalVisible(false);
      Alert.alert("Thành công", "Thêm vaccine thành công!");
    } catch (error) {
      console.error("Error adding vaccine:", error);
      Alert.alert("Lỗi", "Không thể thêm vaccine.");
    } finally {
      setLoading(false);
    }
  };

  // Sửa vaccine
  const editVaccine = async () => {
    if (!newVaccineName || !newVaccineType) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin vaccine.");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await authApis(token).patch(
        `${endpoints["vaccines"]}${editingVaccine.id}/`,
        {
          name: newVaccineName,
          type: newVaccineType,
        }
      );
      const updatedVaccines = vaccines.map((vaccine) =>
        vaccine.id === editingVaccine.id ? response.data : vaccine
      ).sort((a, b) => a.name.localeCompare(b.name));
      setVaccines(updatedVaccines);
      filterVaccines(updatedVaccines, searchQuery, filterType, 1);
      setNewVaccineName("");
      setNewVaccineType("");
      setIsEditModalVisible(false);
      Alert.alert("Thành công", "Cập nhật vaccine thành công!");
    } catch (error) {
      console.error("Error updating vaccine:", error);
      Alert.alert("Lỗi", "Không thể cập nhật vaccine.");
    } finally {
      setLoading(false);
    }
  };

  // Xóa vaccine
  const deleteVaccine = async (vaccineId) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      await authApis(token).delete(`${endpoints["vaccines"]}${vaccineId}/`);
      const updatedVaccines = vaccines.filter((vaccine) => vaccine.id !== vaccineId).sort((a, b) => a.name.localeCompare(b.name));
      setVaccines(updatedVaccines);
      filterVaccines(updatedVaccines, searchQuery, filterType, 1);
      Alert.alert("Thành công", "Xóa vaccine thành công!");
    } catch (error) {
      console.error("Error deleting vaccine:", error);
      Alert.alert("Lỗi", "Không thể xóa vaccine.");
    } finally {
      setLoading(false);
    }
  };

  const renderVaccine = ({ item }) => (
    <View style={styles.vaccineCard}>
      <View style={styles.vaccineInfo}>
        <Text style={styles.vaccineText}>Tên: {item.name}</Text>
        <Text style={styles.vaccineText}>Loại: {item.type || "Không xác định"}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setEditingVaccine(item);
            setNewVaccineName(item.name);
            setNewVaccineType(item.type);
            setIsEditModalVisible(true);
          }}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#0c5776" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => deleteVaccine(item.id)}
        >
          <MaterialCommunityIcons name="delete" size={20} color="#ff0000" />
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Quản Lý Vaccine</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setIsFilterVisible(true)}
        >
          <MaterialCommunityIcons name="filter" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0c5776" style={styles.loader} />
      ) : (
        <View style={styles.contentContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo tên vaccine..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsAddModalVisible(true)}
          >
            <Text style={styles.addButtonText}>Thêm Vaccine</Text>
          </TouchableOpacity>
          <FlatList
            data={displayedVaccines}
            renderItem={renderVaccine}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Không có vaccine nào.</Text>
            }
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMoreVaccines}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator size="small" color="#0c5776" style={styles.loader} />
              ) : null
            }
          />
        </View>
      )}

      {/* Modal thêm vaccine */}
      <Modal
        transparent={true}
        visible={isAddModalVisible}
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.fixedTitle}>Thêm Vaccine</Text>
            <TextInput
              style={styles.input}
              placeholder="Tên vaccine"
              value={newVaccineName}
              onChangeText={setNewVaccineName}
            />
            <Picker
              selectedValue={newVaccineType}
              style={styles.picker}
              onValueChange={(itemValue) => setNewVaccineType(itemValue)}
            >
              <Picker.Item label="Chọn loại vaccine" value="" />
              {vaccineTypes.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsAddModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.doneButton]}
                onPress={addVaccine}
              >
                <Text style={styles.modalButtonText}>Thêm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal sửa vaccine */}
      <Modal
        transparent={true}
        visible={isEditModalVisible}
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.fixedTitle}>Sửa Vaccine</Text>
            <TextInput
              style={styles.input}
              placeholder="Tên vaccine"
              value={newVaccineName}
              onChangeText={setNewVaccineName}
            />
            <Picker
              selectedValue={newVaccineType}
              style={styles.picker}
              onValueChange={(itemValue) => setNewVaccineType(itemValue)}
            >
              <Picker.Item label="Chọn loại vaccine" value="" />
              {vaccineTypes.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.doneButton]}
                onPress={editVaccine}
              >
                <Text style={styles.modalButtonText}>Cập nhật</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal bộ lọc loại vaccine */}
      <Modal
        transparent={true}
        visible={isFilterVisible}
        animationType="slide"
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.fixedTitle}>Loại Vaccine</Text>
            <Picker
              selectedValue={filterType}
              style={styles.picker}
              onValueChange={(itemValue) => setFilterType(itemValue)}
            >
              <Picker.Item label="Tất cả" value="" />
              {vaccineTypes.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
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
    marginTop: 20,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  vaccineCard: {
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
  vaccineInfo: {
    flex: 1,
  },
  vaccineText: {
    fontSize: 16,
    color: "#021b42",
    marginBottom: 5,
  },
  actionButtons: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  searchInput: {
    backgroundColor: "#fff",
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#0c5776",
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
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
  fixedTitle: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    paddingBottom: 10,
  },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    marginHorizontal: 30,
    marginBottom: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  picker: {
    height: 150,
    color: "#021b42",
    marginHorizontal: 30,
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

export default VaccineManagement;