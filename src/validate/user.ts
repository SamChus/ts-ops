import { UserService } from "../services/userService";


export const validateUser = async (email: string) => {
      const user = await UserService.getUserProfileByEmail(email);
    
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }
        return user;
}

export const checkEmail = async (email: string) => {
    const existingUser = await UserService.getUserProfileByEmail(email);
    if (existingUser) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }
}