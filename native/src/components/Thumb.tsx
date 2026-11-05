import { useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import Icon, { CATEGORY_ICON } from "./Icon";
import { thumbUrl } from "@/lib/image";
import { CATEGORY_TINT, type Category } from "@/lib/items";

// 사진이 있으면 사진, 없으면 카테고리 아이콘. 목록은 작은 썸네일을 받고, 썸네일이 없는 예전 글은 원본으로 대체
export default function Thumb({
  category,
  urls,
  style,
  thumb = true,
  iconSize = 36,
}: {
  category: Category;
  urls: string[];
  style?: StyleProp<ViewStyle>;
  thumb?: boolean;
  iconSize?: number;
}) {
  const [failed, setFailed] = useState(false);
  const url = urls[0];
  const src = url && thumb && !failed ? thumbUrl(url) : url;
  return (
    <View style={[s.box, { backgroundColor: CATEGORY_TINT[category] }, style]}>
      {src ? (
        <Image
          source={{ uri: src }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
          onError={() => thumb && setFailed(true)}
        />
      ) : (
        <Icon name={CATEGORY_ICON[category] ?? "gift"} size={iconSize} color="rgba(59,47,39,0.35)" strokeWidth={1.5} />
      )}
    </View>
  );
}

const s = StyleSheet.create({ box: { alignItems: "center", justifyContent: "center", overflow: "hidden" } });
