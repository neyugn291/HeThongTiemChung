import React, { useReducer } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MyUserContext, MyDispatchContext } from "./configs/MyContexts";

// Import các màn hình
import Home from "./components/Home/Home";
import Login from "./components/User/Login";
import Register from "./components/User/Register";
import StaffHome from "./components/Home/StaffHome";
import AdminHome from "./components/Home/AdminHome";
import Account from "./components/User/Account";
import Profile from "./components/User/Profile";

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

const App = () => {
  const [user, dispatch] = useReducer(MyUserReducer, null);

  return (
    <MyUserContext.Provider value={user}>
      <MyDispatchContext.Provider value={dispatch}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="StaffHome" component={StaffHome} />
            <Stack.Screen name="AdminHome" component={AdminHome} />
            <Stack.Screen name="Account" component={Account} />
            <Stack.Screen name="Profile" component={Profile} />
          </Stack.Navigator>
        </NavigationContainer>
      </MyDispatchContext.Provider>
    </MyUserContext.Provider>
  );
};

export default App;