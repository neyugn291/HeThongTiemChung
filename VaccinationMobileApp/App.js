import React, { useReducer } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MyUserContext, MyDispatchContext } from "./configs/MyContexts";

// Import các màn hình
import Home from "./components/Home/Home";
import Login from "./components/User/Login";
import Register from "./components/User/Register";

// Reducer để quản lý trạng thái người dùng
const MyUserReducer = (state, action) => {
  switch (action.type) {
    case "login":
      return action.payload;
    case "logout":
      return null;
    default:
      return state;
  }
};

// Stack chính của ứng dụng
const Stack = createNativeStackNavigator();

// Bottom tab navigator (sau khi đăng nhập)
const Tab = createBottomTabNavigator();

const MainApp = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#64748b",
      }}
    >
      <Tab.Screen
        name="home"
        component={Home}
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  const [user, dispatch] = useReducer(MyUserReducer, null);

  return (
    <MyUserContext.Provider value={user}>
      <MyDispatchContext.Provider value={dispatch}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user === null ? (
              <>
                <Stack.Screen name="Login" component={Login} />
                <Stack.Screen name="Register" component={Register} />
              </>
            ) : (
              <Stack.Screen name="MainApp" component={MainApp} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </MyDispatchContext.Provider>
    </MyUserContext.Provider>
  );
};

export default App;