import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Styles from "../../components/Home/Styles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

const AdminHome = ({ navigation, route }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại!");
        }

        const response = await authApis(token).get(endpoints["currentUser"]);
        console.log("Thông tin người dùng:", response.data);

        setUserData(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu người dùng:", error.message);
        setUserData({ firstName: "Admin" });
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const featureList = [
    { icon: "account-group", label: "Quản lý tài khoản", screen: "ManageAccounts" },
    { icon: "calendar-range-outline", label: "Quản lý các đợt tiêm chủng", screen: "ManageVaccinationSchedules" },
    { icon: "hospital-box-outline", label: "Quản lý thông tin vaccine", screen: "ManageVaccines" },
  ];

  const navItems = [
    { icon: "home", label: "Trang chủ", screen: "AdminHome" },
    { icon: "account", label: "Tài khoản", screen: "Account" },
  ];

  const userFirstName = userData?.first_name || "Admin";

  const userAvatar = userData?.avatar ? (
    <Image
      source={{ uri: userData.avatar }}
      style={Styles.avatar}
      onError={(e) => console.log("Lỗi tải avatar:", e.nativeEvent.error)}
    />
  ) : (
    <MaterialCommunityIcons
      name="account-circle"
      size={40}
      color="#fff"
      style={Styles.avatarIcon}
    />
  );

  return (
    <View style={Styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView>
        <View
          style={[
            Styles.header,
            { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 44 },
          ]}
        >
          {loading ? (
            <Text style={Styles.greetingText}>Đang tải...</Text>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {userAvatar}
              <View>
                <Text style={Styles.greetingText}>Chào bạn,</Text>
                <Text style={Styles.nameText}>{userFirstName}</Text>
              </View>
              <TouchableOpacity style={Styles.notification}>
                <MaterialCommunityIcons name="bell" size={24} color="#fff" />
                <View style={Styles.notificationBadge}>
                  <Text style={Styles.notificationText}>1</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={Styles.gridContainer}>
          {featureList.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={Styles.newGridItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons name={item.icon} size={24} color="#021b42" />
                <Text style={Styles.newGridLabel}>{item.label}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#021b42" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View>
        <TouchableOpacity>
          <Text style={Styles.footerText}>
            Xem báo cáo thống kê từ các đợt tiêm chủng
          </Text>
        </TouchableOpacity>
        <View style={{ width: "90%", marginHorizontal: "auto", marginBottom: 25 }}>
          <Image
            source={require("../../assets/Banner.png")}
            style={Styles.footerBanner}
          />
        </View>

        <View style={Styles.bottomNav}>
          {navItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={Styles.navItem}
              onPress={() => {
                navigation.navigate(item.screen, { navItems });
              }}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={24}
                color={route?.name === item.screen ? "#021b42" : "#174171"}
              />
              <Text
                style={[
                  Styles.navLabel,
                  route?.name === item.screen && Styles.activeNav,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

export default AdminHome;