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
import InjectionSearch from "./components/CitizenModules/InjectionSearch";
import BookingAppointment from "./components/CitizenModules/BookingAppointment";
import DownloadCertificate from "./components/CitizenModules/DownloadCertificate";
import RecordSearch from "./components/CitizenModules/RecordSearch";
import Reminders from "./components/CitizenModules/Reminders";
import VaccineManagement from "./components/AdminModules/VaccineManagement";
import AccountManagement from "./components/AdminModules/AccountManagement";
import AddVaccine from "./components/AdminModules/AddVaccine";
import UpdateVaccine from "./components/AdminModules/UpdateVaccine";
import TypeManagement from "./components/AdminModules/TypeManagement";
import InjectionManagement from "./components/AdminModules/InjectionManagement";
import SiteManagement from "./components/AdminModules/SiteManagement";
import RecordManagement from "./components/StaffModules/RecordManagement";
import EditHealthNote from "./components/StaffModules/EditHealthNote";

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
            <Stack.Screen name="InjectionSearch" component={InjectionSearch} />
            <Stack.Screen name="BookingAppointment" component={BookingAppointment} />
            <Stack.Screen name="DownloadCertificate" component={DownloadCertificate} />
            <Stack.Screen name="RecordSearch" component={RecordSearch} />
            <Stack.Screen name="Reminders" component={Reminders} />
            <Stack.Screen name="VaccineManagement" component={VaccineManagement} />
            <Stack.Screen name="AccountManagement" component={AccountManagement} />
            <Stack.Screen name="AddVaccine" component={AddVaccine} />
            <Stack.Screen name="UpdateVaccine" component={UpdateVaccine} />
            <Stack.Screen name="TypeManagement" component={TypeManagement} />
            <Stack.Screen name="InjectionManagement" component={InjectionManagement} />
            <Stack.Screen name="SiteManagement" component={SiteManagement} />
            <Stack.Screen name="RecordManagement" component={RecordManagement} />
            <Stack.Screen name="EditHealthNote" component={EditHealthNote} />
          </Stack.Navigator>
        </NavigationContainer>
      </MyDispatchContext.Provider>
    </MyUserContext.Provider>
  );
};

export default App;