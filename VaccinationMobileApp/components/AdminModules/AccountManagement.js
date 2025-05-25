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
  TextInput,
  Alert,
  Switch,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";
import { Searchbar } from "react-native-paper";

const AccountManagement = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    citizen_id: "",
    phone_number: "",
    birth_date: "",
    gender: "",
    is_superuser: false,
    is_staff: false,
    is_active: true,
  });
  const [q, setQ] = useState(""); // State cho tìm kiếm
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  // Lấy danh sách tài khoản
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await authApis(token).get(endpoints["listUsers"]);
      setUsers(response.data);
      filterUsers(response.data, q, 1);
    } catch (error) {
      console.error("Lỗi khi tải danh sách tài khoản:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách tài khoản.");
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Lọc và phân trang tài khoản
  const filterUsers = (data, searchQuery, pageNum) => {
    let filtered = data;

    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const startIndex = (pageNum - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = filtered.slice(startIndex, endIndex);

    setFilteredUsers((prev) =>
      pageNum === 1 ? paginatedUsers : [...prev, ...paginatedUsers]
    );
  };

  // Tải thêm tài khoản khi cuộn
  const loadMoreUsers = () => {
    if (isLoadingMore || filteredUsers.length >= users.length) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    filterUsers(users, q, nextPage);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

  // Xử lý tìm kiếm
  const search = (value) => {
    setQ(value);
    setPage(1);
    filterUsers(users, value, 1);
  };

  // Mở modal để thêm hoặc sửa tài khoản
  const openModal = (user = null) => {
    if (user) {
      setIsEditMode(true);
      setCurrentUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        citizen_id: user.citizen_id || "",
        phone_number: user.phone_number || "",
        birth_date: user.birth_date || "",
        gender: user.gender || "",
        is_superuser: user.is_superuser,
        is_staff: user.is_staff,
        is_active: user.is_active,
      });
    } else {
      setIsEditMode(false);
      setCurrentUser(null);
      setFormData({
        username: "",
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        citizen_id: "",
        phone_number: "",
        birth_date: "",
        gender: "",
        is_superuser: false,
        is_staff: false,
        is_active: true,
      });
    }
    setIsModalVisible(true);
  };

  // Xử lý thêm hoặc sửa tài khoản
  const handleSave = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const data = { ...formData };
      if (!isEditMode && !data.password) {
        delete data.password; // Không gửi mật khẩu rỗng khi tạo mới
      }
      if (isEditMode && !data.password) {
        delete data.password; // Không cập nhật mật khẩu nếu không nhập
      }

      let response;
      if (isEditMode) {
        response = await authApis(token).patch(endpoints["users"](currentUser.id), data);
      } else {
        response = await authApis(token).post(endpoints["users"], data);
      }

      Alert.alert("Thành công", response.data.message);
      setIsModalVisible(false);
      fetchUsers(); // Làm mới danh sách
    } catch (error) {
      console.error("Lỗi khi lưu tài khoản:", error);
      Alert.alert("Lỗi", error.response?.data?.detail || "Không thể lưu tài khoản.");
    }
  };

  // Xóa tài khoản
  const handleDelete = (userId) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc muốn xóa tài khoản này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              await authApis(token).delete(endpoints["users"](userId));
              Alert.alert("Thành công", "Tài khoản đã được xóa.");
              fetchUsers();
            } catch (error) {
              console.error("Lỗi khi xóa tài khoản:", error);
              Alert.alert("Lỗi", "Không thể xóa tài khoản.");
            }
          },
        },
      ]
    );
  };

  // Hiển thị mỗi tài khoản
  const renderUser = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userText}>Tên tài khoản: {item.username}</Text>
        <Text style={styles.userText}>Email: {item.email}</Text>
        <Text style={styles.userText}>
          Họ tên: {item.first_name} {item.last_name}
        </Text>
        <Text style={styles.userText}>Quyền: {item.is_superuser ? "Admin" : item.is_staff ? "Nhân viên" : "Người dùng"}</Text>
        <Text style={styles.userText}>Trạng thái: {item.is_active ? "Hoạt động" : "Không hoạt động"}</Text>
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openModal(item)}
        >
          <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}
        >
          <MaterialCommunityIcons name="delete" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Xóa</Text>
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
        <Text style={styles.headerTitle}>Quản Lý Tài Khoản</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openModal()}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Thanh tìm kiếm */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Tìm kiếm theo tên tài khoản hoặc email"
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
            data={filteredUsers}
            renderItem={renderUser}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {q ? "Không tìm thấy tài khoản với từ khóa này." : "Không có tài khoản nào."}
              </Text>
            }
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMoreUsers}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator size="small" color="#0c5776" style={styles.loader} />
              ) : null
            }
          />
        </View>
      )}

      {/* Modal để thêm/sửa tài khoản */}
      <Modal
        transparent={true}
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditMode ? "Sửa Tài Khoản" : "Thêm Tài Khoản"}</Text>
            <TextInput
              style={styles.input}
              placeholder="Tên tài khoản"
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
            />
            <TextInput
              style={styles.input}
              placeholder={isEditMode ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu"}
              value={formData.password}
              secureTextEntry
              onChangeText={(text) => setFormData({ ...formData, password: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Họ"
              value={formData.first_name}
              onChangeText={(text) => setFormData({ ...formData, first_name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Tên"
              value={formData.last_name}
              onChangeText={(text) => setFormData({ ...formData, last_name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Căn cước công dân"
              value={formData.citizen_id}
              onChangeText={(text) => setFormData({ ...formData, citizen_id: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              value={formData.phone_number}
              onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Ngày sinh (YYYY-MM-DD)"
              value={formData.birth_date}
              onChangeText={(text) => setFormData({ ...formData, birth_date: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Giới tính"
              value={formData.gender}
              onChangeText={(text) => setFormData({ ...formData, gender: text })}
            />
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Quyền Admin</Text>
              <Switch
                value={formData.is_superuser}
                onValueChange={(value) => setFormData({ ...formData, is_superuser: value })}
                trackColor={{ false: "#767577", true: "#0c5776" }}
                thumbColor={formData.is_superuser ? "#f4f3f4" : "#f4f3f4"}
              />
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Quyền Nhân viên</Text>
              <Switch
                value={formData.is_staff}
                onValueChange={(value) => setFormData({ ...formData, is_staff: value })}
                trackColor={{ false: "#767577", true: "#0c5776" }}
                thumbColor={formData.is_staff ? "#f4f3f4" : "#f4f3f4"}
              />
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Trạng thái hoạt động</Text>
              <Switch
                value={formData.is_active}
                onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                trackColor={{ false: "#767577", true: "#0c5776" }}
                thumbColor={formData.is_active ? "#f4f3f4" : "#f4f3f4"}
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.doneButton]}
                onPress={handleSave}
              >
                <Text style={styles.modalButtonText}>Lưu</Text>
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
  addButton: {
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
  contentContainer: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  userCard: {
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
  userInfo: {
    flex: 1,
  },
  userText: {
    fontSize: 16,
    color: "#021b42",
    marginBottom: 5,
  },
  userActions: {
    flexDirection: "column",
    justifyContent: "center",
  },
  actionButton: {
    backgroundColor: "#0c5776",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  deleteButton: {
    backgroundColor: "#d32f2f",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
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
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#e0f2fe",
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 10,
    color: "#021b42",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: "#fff",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
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

export default AccountManagement;