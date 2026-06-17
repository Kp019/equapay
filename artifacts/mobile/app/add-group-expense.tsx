import { Redirect, useLocalSearchParams } from "expo-router";

export default function AddGroupExpense() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <Redirect href={`/add-bill?groupId=${groupId ?? ""}`} />;
}
