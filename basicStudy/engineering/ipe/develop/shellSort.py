def shell_sort(arr):
    n = len(arr)  # 배열 길이
    gap = n // 2  # ÷2, 소숫점 내림: 0부터 시작하므로 '중간' 또는 '중간+1'

    while gap > 0:
        for i in range(gap, n):
            temp = arr[i]
            j = i
            while (
                j >= gap and arr[j - gap] > temp
            ):  # gap 거리에 있는 데이터끼리만 비교 - 교환 횟수가 단축됨
                arr[j] = arr[j - gap]
                j -= gap
            arr[j] = temp
            # print(arr, "i:", temp) # 테스트 코드: 중간 과정 검토
        gap //= 2
    return arr


arr = [34, 12, 54, 2, 3]  # 예시: 정렬할 리스트
sorted_arr = shell_sort(arr)
print("정렬된 배열:", sorted_arr)  # 정렬된 배열: [2, 3, 12, 34, 54]
