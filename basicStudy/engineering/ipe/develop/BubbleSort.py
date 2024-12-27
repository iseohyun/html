def bubble_sort(arr):
    n = len(arr)

    for i in range(n - 1):  # 처음 ~ 끝
        for j in range(0, n - i - 1):  # 처음 ~ 끝에서 i번째까지
            if arr[j] > arr[j + 1]:  # 내 뒤가 나보다 크면 교체
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr


arr = [64, 34, 25, 12, 22, 11, 90]  # 예시 : 정렬할 리스트
sorted_arr = bubble_sort(arr)
print("정렬된 배열:", sorted_arr)  # 정렬된 배열: [11, 12, 22, 25, 34, 64, 90]
