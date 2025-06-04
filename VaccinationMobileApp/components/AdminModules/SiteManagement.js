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

const SiteManagement = ({ navigation }) => {
  const [sites, setSites] = useState([]);
  const [displayedSites, setDisplayedSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newSite, setNewSite] = useState({ name: "", address: "", phone: "" });
  const [editSiteId, setEditSiteId] = useState(null);
  const [editSite, setEditSite] = useState({ name: "", address: "", phone: "" });
  const [page, setPage] = useState(1);
  const pageSize = 4; // Số lượng bản ghi hiển thị mỗi lần tải

  useEffect(() => {
    fetchSites();
  }, []);

  // Lấy danh sách địa điểm
  const fetchSites = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      console.log("Fetching sites from:", endpoints.sites()); // Log
      const response = await authApis(token).get(endpoints.sites());
      console.log("Sites API response:", response.data); // Log
      const sortedSites = response.data.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setSites(sortedSites);
      setDisplayedSites(sortedSites.slice(0, pageSize)); // Hiển thị trang đầu tiên
      setPage(1);
    } catch (error) {
      console.error("Error details:", error.response?.data || error.message); // Log
      Alert.alert("Lỗi", "Không thể tải danh sách địa điểm.");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreSites = () => {
    if (displayedSites.length >= sites.length) return;

    const nextPage = page + 1;
    const newSites = sites.slice(0, nextPage * pageSize);
    setDisplayedSites(newSites);
    setPage(nextPage);

    console.log("loadMoreSites - New page:", nextPage);
    console.log("loadMoreSites - New displayed sites:", newSites.length);
  };

  // Thêm địa điểm
  const addSite = async () => {
    if (!newSite.name.trim() || !newSite.address.trim() || !newSite.phone.trim()) {
      Alert.alert("Lỗi", "Tên, địa chỉ và số điện thoại không được để trống.");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      await authApis(token).post(endpoints.sites(), {
        name: newSite.name,
        address: newSite.address,
        phone: newSite.phone,
      });
      setNewSite({ name: "", address: "", phone: "" });
      setModalVisible(false);
      fetchSites(); // Làm mới
      Alert.alert("Thành công", "Thêm địa điểm thành công!");
    } catch (error) {
      console.error("Error adding site:", error.response?.data || error.message); // Log
      Alert.alert("Lỗi", "Không thể thêm địa điểm.");
    } finally {
      setLoading(false);
    }
  };

  // Sửa địa điểm
  const updateSite = async () => {
    if (!editSite.name.trim() || !editSite.address.trim() || !editSite.phone.trim()) {
      Alert.alert("Lỗi", "Tên, địa chỉ và số điện thoại không được để trống.");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      await authApis(token).put(endpoints.sites(editSiteId), {
        name: editSite.name,
        address: editSite.address,
        phone: editSite.phone,
      });
      setEditSiteId(null);
      setEditSite({ name: "", address: "", phone: "" });
      setEditModalVisible(false);
      fetchSites(); // Làm mới
      Alert.alert("Thành công", "Cập nhật địa điểm thành công!");
    } catch (error) {
      console.error("Error updating site:", error.response?.data || error.message); // Log
      Alert.alert("Lỗi", "Không thể cập nhật địa điểm.");
    } finally {
      setLoading(false);
    }
  };

  // Xóa địa điểm
  const deleteSite = async (id) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc muốn xóa địa điểm này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem("token");
              await authApis(token).delete(endpoints.sites(id));
              fetchSites(); // Làm mới
              Alert.alert("Thành công", "Xóa địa điểm thành công!");
            } catch (error) {
              console.error("Error deleting site:", error.response?.data || error.message); // Log
              Alert.alert("Lỗi", "Không thể xóa địa điểm.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Mở modal chỉnh sửa
  const openEditModal = (id, name, address, phone) => {
    setEditSiteId(id);
    setEditSite({ name, address, phone });
    setEditModalVisible(true);
  };

  // Hiển thị mỗi địa điểm
  const renderSite = ({ item }) => (
    <View style={styles.typeCard}>
      <View style={styles.typeInfo}>
        <Text style={[styles.typeText, { fontWeight: "bold" }]}>
          {item.name}
        </Text>
        <Text style={styles.typeText}>Địa chỉ: {item.address}</Text>
        <Text style={styles.typeText}>SĐT: {item.phone}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item.id, item.name, item.address, item.phone)}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteSite(item.id)}
        >
          <MaterialCommunityIcons name="delete" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (displayedSites.length >= sites.length) return null;
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
        <Text style={styles.headerTitle}>Quản Lý Địa Điểm</Text>
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
            <Text style={styles.addButtonText}>Thêm Địa Điểm</Text>
          </TouchableOpacity>
          <FlatList
            data={displayedSites}
            renderItem={renderSite}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Không có địa điểm nào.</Text>
            }
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMoreSites}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          />
        </View>
      )}

      {/* Modal thêm địa điểm */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm Địa Điểm</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập tên địa điểm"
              value={newSite.name}
              onChangeText={(text) => setNewSite({ ...newSite, name: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập địa chỉ"
              value={newSite.address}
              onChangeText={(text) => setNewSite({ ...newSite, address: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập số điện thoại"
              value={newSite.phone}
              onChangeText={(text) => setNewSite({ ...newSite, phone: text })}
              keyboardType="phone-pad"
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
                onPress={addSite}
              >
                <Text style={styles.modalButtonText}>Thêm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal chỉnh sửa địa điểm */}
      <Modal
        transparent={true}
        visible={editModalVisible}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chỉnh Sửa Địa Điểm</Text>
            <TextInput
              style={styles.modalInput}
              value={editSite.name}
              onChangeText={(text) => setEditSite({ ...editSite, name: text })}
            />
            <TextInput
              style={styles.modalInput}
              value={editSite.address}
              onChangeText={(text) => setEditSite({ ...editSite, address: text })}
            />
            <TextInput
              style={styles.modalInput}
              value={editSite.phone}
              onChangeText={(text) => setEditSite({ ...editSite, phone: text })}
              keyboardType="phone-pad"
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
                onPress={updateSite}
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

export default SiteManagement;