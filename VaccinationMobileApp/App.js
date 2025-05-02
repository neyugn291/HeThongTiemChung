import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Home from "./components/Home/Home";
import Login from "./components/User/Login";
import Register from "./components/User/Register";

// Tạo stack navigator cho các màn hình liên quan đến người dùng
const UserStack = createNativeStackNavigator();
const UserStackNavigator = () => {
  return (
    <UserStack.Navigator>
      <UserStack.Screen 
        name="login" 
        component={Login} 
        options={{ title: 'Đăng nhập' }} 
      />
      <UserStack.Screen 
        name="register" 
        component={Register} 
        options={{ title: 'Đăng ký' }} 
      />
    </UserStack.Navigator>
  );
};

// Tạo stack navigator chính
const MainStack = createNativeStackNavigator();
const MainStackNavigator = () => {
  return (
    <MainStack.Navigator>
      <MainStack.Screen 
        name="home" 
        component={Home} 
        options={{ title: 'Màn hình chính' }} 
      />
    </MainStack.Navigator>
  );
};

// Tạo bottom tab navigator
const Tab = createBottomTabNavigator();
const TabNavigator = () => {
  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tab.Screen
        name="main"
        component={MainStackNavigator}
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="user"
        component={UserStackNavigator}
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
};

export default App;