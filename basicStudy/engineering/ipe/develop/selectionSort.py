def selection_sort(arr):
    n = len(arr)  # 배열 길이

    for i in range(n - 1):  # 처음 ~ 끝
        min_index = i
        for j in range(i + 1, n):  # i ~ 끝
            if arr[j] < arr[min_index]:  # 내 뒤에 있는 숫자 중 가장 작은 값을 찾는다.
                min_index = j  # 최소값 갱신
        if min_index != i:  # 내가 최소값이 아니라면
            arr[i], arr[min_index] = arr[min_index], arr[i]  # 두 값을 교환
    return arr


arr = [64, 25, 12, 22, 11]  # 예시: 정렬할 리스트
sorted_arr = selection_sort(arr)
print("정렬된 배열:", sorted_arr)  # 정렬된 배열: [11, 12, 22, 25, 64]
