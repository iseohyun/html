def merge(
    left, right
):  # 우측 리그와 좌측 리그는 각각 정렬이 완료된 상태로 입력이 들어온다.
    merged = []
    left_index, right_index = 0, 0
    # 1: 어느 한 요소가 오링 날 때까지, 작은 요소들을 수집
    while left_index < len(left) and right_index < len(right):
        if left[left_index] < right[right_index]:
            merged.append(left[left_index])
            left_index += 1
        else:
            merged.append(right[right_index])
            right_index += 1
    # 2: 남은 요소들을 병합
    merged += left[left_index:]
    merged += right[right_index:]
    return merged


def merge_sort(arr):
    if len(arr) <= 1:
        return arr

    mid = len(arr) // 2 # 리스트를 반으로 나누기
    left_half = arr[:mid] 
    right_half = arr[mid:]
    # print(left_half, right_half) # Test Code : 나눠진 그룹 확인하기

    left_half = merge_sort(left_half) # 분할요소에 대해 반복 수행
    right_half = merge_sort(right_half)

    return merge(left_half, right_half) # 정렬


arr = [38, 27, 43, 3, 9, 82, 10]  # 예시: 정렬할 리스트
sorted_arr = merge_sort(arr)
print("정렬된 배열:", sorted_arr)  # 정렬된 배열: [3, 9, 10, 27, 38, 43, 82]
