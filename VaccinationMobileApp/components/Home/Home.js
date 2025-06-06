import React, { useState, useEffect, useRef } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, StatusBar, Platform, Animated } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Video } from "expo-av";
import Styles from "../../components/Home/Styles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

const Home = ({ navigation, route }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
        setUserData({ firstName: "Khách" });
        setLoading(false);
      }
    };
    fetchUserData();

    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  const featureList = [
    { icon: "calendar-search", label: "Tra cứu lịch tiêm", screen: "InjectionSearch" },
    { icon: "calendar-star", label: "Đặt lịch hẹn", screen: "BookingAppointment" },
    { icon: "file-download-outline", label: "Tải giấy chứng nhận", screen: "DownloadCertificate" },
    { icon: "text-box-search-outline", label: "Tra cứu lịch sử tiêm", screen: "RecordSearch" },
  ];

  const navItems = [
    { icon: "home", label: "Trang chủ", screen: "Home" },
    { icon: "bell-badge", label: "Nhắc lịch tiêm", screen: "Reminders" },
    { icon: "message", label: "Liên hệ", screen: "Contact" },
    { icon: "account", label: "Tài khoản", screen: "Account" },
  ];

  const userFirstName = userData?.first_name || "Khách";

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

  const handleOpenAI = () => {
    navigation.navigate("ChatScreen");
  };

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

        <View style={{ width: "90%", margin: "auto" }}>
          <Video
            source={require("../../assets/Banner.mp4")}
            style={Styles.banner}
            resizeMode="cover"
            shouldPlay={true}
            isLooping={true}
            isMuted={true}
          />
        </View>

        <View style={Styles.gridContainer}>
          {featureList.map((item, index) => (
            <TouchableOpacity key={index} style={Styles.gridItem} onPress={() => {
              navigation.navigate(item.screen, { featureList });
            }}>
              <View style={Styles.iconBox}>
                <MaterialCommunityIcons name={item.icon} size={26} color="#0c5776" />
              </View>
              <Text style={Styles.iconLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View>
        <TouchableOpacity onPress={() => navigation.navigate("Stats")}>
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

      <View style={Styles.aiContainer}>
        <Animated.View
          style={[
            Styles.aiSpeechBubble,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={Styles.aiSpeechText}>Xin chào, bạn có cần giúp gì không?</Text>
        </Animated.View>
        <TouchableOpacity style={Styles.aiButton} onPress={handleOpenAI}>
          <Image
            source={require("../../assets/robot.png")}
            style={Styles.aiIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Home;