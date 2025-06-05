import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

const TypeManagement = ({ navigation }) => {
  const [vaccineTypes, setVaccineTypes] = useState([]);
  const [displayedVaccineTypes, setDisplayedVaccineTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [editTypeId, setEditTypeId] = useState(null);
  const [editTypeName, setEditTypeName] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 4; // Số lượng bản ghi hiển thị mỗi lần tải

  useEffect(() => {
    fetchVaccineTypes();
  }, []);

  // Lấy danh sách loại vaccine
  const fetchVaccineTypes = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      console.log("Fetching vaccine types from:", endpoints.vaccineTypes()); // Log
      const response = await authApis(token).get(endpoints.vaccineTypes());
      console.log("VaccineTypes API response:", response.data); // Log
      const sortedTypes = response.data.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setVaccineTypes(sortedTypes);
      setDisplayedVaccineTypes(sortedTypes.slice(0, pageSize)); // Hiển thị trang đầu tiên
      setPage(1);
    } catch (error) {
      console.error("Error details:", error.response?.data || error.message); // Log
      Alert.alert("Lỗi", "Không thể tải danh sách loại vaccine.");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreVaccineTypes = () => {
    if (displayedVaccineTypes.length >= vaccineTypes.length) return;

    const nextPage = page + 1;
    const newTypes = vaccineTypes.slice(0, nextPage * pageSize);
    setDisplayedVaccineTypes(newTypes);
    setPage(nextPage);

    console.log("loadMoreVaccineTypes - New page:", nextPage);
    console.log("loadMoreVaccineTypes - New displayed types:", newTypes.length);
  };

  // Thêm loại vaccine
  const addVaccineType = async () => {
    if (!newTypeName.trim()) {
      Alert.alert("Lỗi", "Tên loại vaccine không được để trống.");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      await authApis(token).post(endpoints.vaccineTypes(), {
        name: newTypeName,
      });
      setNewTypeName("");
      setModalVisible(false);
      fetchVaccineTypes(); // Làm mới
      Alert.alert("Thành công", "Thêm loại vaccine thành công!");
    } catch (error) {
      console.error("Error adding vaccine type:", error.response?.data || error.message); // Log
      Alert.alert("Lỗi", "Không thể thêm loại vaccine.");
    } finally {
      setLoading(false);
    }
  };

  // Sửa loại vaccine
  const updateVaccineType = async () => {
    if (!editTypeName.trim()) {
      Alert.alert("Lỗi", "Tên loại vaccine không được để trống.");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      await authApis(token).put(endpoints.vaccineTypes(editTypeId), {
        name: editTypeName,
      });
      setEditTypeId(null);
      setEditTypeName("");
      setEditModalVisible(false);
      fetchVaccineTypes(); // Làm mới
      Alert.alert("Thành công", "Cập nhật loại vaccine thành công!");
    } catch (error) {
      console.error("Error updating vaccine type:", error.response?.data || error.message); // Log
      Alert.alert("Lỗi", "Không thể cập nhật loại vaccine.");
    } finally {
      setLoading(false);
    }
  };

  // Xóa loại vaccine
  const deleteVaccineType = async (id) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc muốn xóa loại vaccine này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem("token");
              await authApis(token).delete(endpoints.vaccineTypes(id));
              fetchVaccineTypes(); // Làm mới
              Alert.alert("Thành công", "Xóa loại vaccine thành công!");
            } catch (error) {
              console.error("Error deleting vaccine type:", error.response?.data || error.message); // Log
              Alert.alert("Lỗi", "Không thể xóa loại vaccine.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Mở modal chỉnh sửa
  const openEditModal = (id, name) => {
    setEditTypeId(id);
    setEditTypeName(name);
    setEditModalVisible(true);
  };

  // Hiển thị mỗi loại vaccine
  const renderVaccineType = ({ item }) => (
    <View style={styles.typeCard}>
      <View style={styles.typeInfo}>
        <Text style={[styles.typeText, { fontWeight: "bold" }]}>
          {item.name}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item.id, item.name)}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteVaccineType(item.id)}
        >
          <MaterialCommunityIcons name="delete" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (displayedVaccineTypes.length >= vaccineTypes.length) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#0c5776" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản Lý Loại Vaccine</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0c5776" style={styles.loader} />
      ) : (
        <View style={styles.contentContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addButtonText}>Thêm Loại Vaccine</Text>
          </TouchableOpacity>
          <FlatList
            data={displayedVaccineTypes}
            renderItem={renderVaccineType}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Không có loại vaccine nào.</Text>
            }
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMoreVaccineTypes}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          />
        </View>
      )}

      {/* Modal thêm loại vaccine */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm Loại Vaccine</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập tên loại vaccine"
              value={newTypeName}
              onChangeText={setNewTypeName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.doneButton]}
                onPress={addVaccineType}
              >
                <Text style={styles.modalButtonText}>Thêm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal chỉnh sửa loại vaccine */}
      <Modal
        transparent={true}
        visible={editModalVisible}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chỉnh Sửa Loại Vaccine</Text>
            <TextInput
              style={styles.modalInput}
              value={editTypeName}
              onChangeText={setEditTypeName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.doneButton]}
                onPress={updateVaccineType}
              >
                <Text style={styles.modalButtonText}>Cập nhật</Text>
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
  placeholder: {
    width: 24,
  },
  contentContainer: {
    flex: 1,
    marginTop: 20,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  typeCard: {
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
  typeInfo: {
    flex: 1,
  },
  typeText: {
    fontSize: 16,
    color: "#021b42",
    marginBottom: 5,
  },
  actionButtons: {
    flexDirection: "row",
  },
  editButton: {
    backgroundColor: "#0c5776",
    padding: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: "#f08486",
    padding: 8,
    borderRadius: 4,
  },
  addButton: {
    backgroundColor: "#0c5776",
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyText: {
    fontSize: 16,
    color: "#616161",
    textAlign: "center",
    marginTop: 20,
  },
  loader: {
    marginTop: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    color: "#021b42",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  modalInput: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    marginBottom: 20,
    borderRadius: 4,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f08486",
    marginRight: 10,
  },
  doneButton: {
    backgroundColor: "#0c5776",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default TypeManagement;