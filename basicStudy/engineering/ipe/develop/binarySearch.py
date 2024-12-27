def binary_search(arr, target):
    left = 0
    right = len(arr) - 1

    while left <= right:
        mid = left + (right - left) // 2

        if arr[mid] == target:
            return mid  # 목표 값을 찾으면
        elif arr[mid] < target:  # 중간값이 목표 값보다 donw이면 오른쪽 탐색
            left = mid + 1
        else:  # 중간값이 목표 값보다 up이면 왼쪽 탐색
            right = mid - 1

    return -1  # 목표 값이 배열에 없을 때


arr = [2, 3, 5, 7, 11, 13, 17, 19, 23]
target = 10
result = binary_search(arr, target)
if result != -1:
    print(f"{target}은(는) 인덱스 {result}에 있습니다.")
else:
    print(f"{target}을(를) 찾을 수 없습니다.")
