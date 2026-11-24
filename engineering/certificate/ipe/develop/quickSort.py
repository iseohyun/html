def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    else:
        pivot = arr[0]  # 가장 첫 데이터가 기준이 됨
        less_than_pivot = [x for x in arr[1:] if x <= pivot]  # 나보다 작은 수들의 모임
        greater_than_pivot = [x for x in arr[1:] if x > pivot]  # 나보다 큰 수들의 모임
        # print(pivot, less_than_pivot, greater_than_pivot) # 테스트 코드
        return (
            quick_sort(less_than_pivot) + [pivot] + quick_sort(greater_than_pivot)
        )  # 정리된 작은 모임 + 나 + 정리된 큰 모임


arr = [6, 9, 3, 5, 2, 1, 7, 4]  # 예시 : 정렬할 리스트
sorted_arr = quick_sort(arr)
print("정렬된 배열:", sorted_arr)  # 정렬된 배열: [1, 2, 3, 4, 5, 6, 7, 9]
