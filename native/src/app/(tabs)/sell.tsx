import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ItemForm from "@/components/ItemForm";
import { T } from "@/components/ui";

export default function SellScreen() {
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <Text style={[T.h1, { paddingHorizontal: 20, paddingTop: 16 }]}>물건 등록</Text>
      <ItemForm />
    </SafeAreaView>
  );
}
