// app/signup.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, Text, TextInput, View, Image } from "react-native";

const BACKEND_URL = "";

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  const handleSignup = async () => {
    if (!email.includes("@")) {
      Alert.alert("Invalid email");
      return;
    }

    // PIN must be exactly 6 digits
    if (!/^\d{6}$/.test(pin)) {
      Alert.alert("PIN must be exactly 6 digits");
      return;
    }

    const res = await fetch(`${BACKEND_URL}/signup.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, user_pin: pin }),
    });

    const data = await res.json();

    if (data.error) {
      Alert.alert("Signup Error", data.error);
      return;
    }

    // Save merchant_id
    await AsyncStorage.setItem("merchant_id", String(data.merchant_id));
    await AsyncStorage.setItem("joelsapos_taptopay_merchant_id", String(data.merchant_id));
    await AsyncStorage.setItem("stripe_account_id", "");
    await AsyncStorage.setItem("onboarding_complete", "false");

    if (data.existing) {
      Alert.alert("Welcome back!", "Login instead.");
      router.replace("/login");
    } else {
      Alert.alert("Account created", "Please login.");
      router.replace("/login");
    }
  };

  return (
    <View style={{ padding: 20, marginTop: 80 }}>

 {/* TapToPay Logo */}
<View style={{ alignItems: "center", marginBottom: 25 }}>
  <Image
    source={require("../assets/taptopay.png")}
    style={{
      width: "60%",
      height: undefined,
      aspectRatio: 1, // keeps it square
    }}
    resizeMode="contain"
  />
</View>



      <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 20 }}>
        Create your account
      </Text>

      <TextInput
        placeholder="Your Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          padding: 10,
          borderRadius: 8,
          marginBottom: 20,
        }}
      />

      <TextInput
        placeholder="Enter a 6-digit PIN"
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        style={{
          borderWidth: 1,
          padding: 10,
          borderRadius: 8,
          marginBottom: 20,
        }}
      />

      <Button title="Continue" onPress={handleSignup} />

      <View style={{ height: 10 }} />

      <Button
        title="Already have an account? Login"
        onPress={() => router.push("/login")}
      />
    </View>
  );
}

// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { useRouter } from "expo-router";
// import React, { useState } from "react";
// import { Alert, Button, Text, TextInput, View } from "react-native";

// const BACKEND_URL = "https://joelsapos.com/taptopay";

// export default function SignupScreen() {
//   const router = useRouter();
//   const [email, setEmail] = useState("");

//   const handleSignup = async () => {
//     if (!email.includes("@")) {
//       Alert.alert("Invalid email");
//       return;
//     }

//     const res = await fetch(`https://joelsapos.com/taptopay/signup.php`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ email }),
//     });

//     const data = await res.json();

//     if (data.error) {
//       Alert.alert("Signup Error", data.error);
//       return;
//     }

//     // Save merchant ID ONLY
//     await AsyncStorage.setItem("merchant_id", String(data.merchant_id));
//     await AsyncStorage.setItem("stripe_account_id", ""); // none yet
//     await AsyncStorage.setItem("onboarding_complete", "false");

//     Alert.alert("Account created", "Please log in.");
//     router.replace("/login");
//   };

//   return (
//     <View style={{ padding: 20, marginTop: 80 }}>
//       <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 20 }}>
//         Create your account
//       </Text>

//       <TextInput
//         placeholder="Your Email"
//         value={email}
//         onChangeText={setEmail}
//         style={{
//           borderWidth: 1,
//           padding: 10,
//           borderRadius: 8,
//           marginBottom: 20,
//         }}
//       />

//       <Button title="Continue" onPress={handleSignup} />

//       <View style={{ height: 10 }} />

//       <Button
//         title="Already have an account? Login"
//         onPress={() => router.push("/login")}
//       />
//     </View>
//   );
// }
